# ResilientSC — Agent Plan (Phase 1)

## Ground rules (apply to every agent below)

- Every agent returns a **structured recommendation**. None writes to the shared
  world state directly — only the orchestrator commits state, and only at the
  named checkpoints in architecture.md §1.
- Every agent's DB access goes through its own listed tool functions, never a raw
  query — satisfies §16 "do not allow agents unrestricted access to the
  database" and §23 least-privilege.
- Every tool function is a plain, typed Python function (`backend/tools/`), unit
  testable without a model or LLM in the loop.
- Naming note: §9/§10 of the brief describe logistics tools narratively
  (`get_available_routes`, `estimate_transit_time`, `get_alternative_routes`)
  while §16's "AGENT TOOLS" section lists slightly different names for the same
  logistics functions (`get_routes`, `calculate_eta`, `generate_alternative_routes`).
  §16 is treated as the canonical contract below since it's the section
  explicitly scoped to tool signatures; flagging the mismatch here rather than
  silently picking one.

## Sensing Agent

**Input:** raw disruption description (simulated event trigger, or free text for
the "structure this into an event" path). **Output:** one validated
`DisruptionEvent`.

Tools: `detect_disruption()`, `classify_event()`, `validate_event()`.

The LLM call lives inside `classify_event()` only, and only produces a
*candidate* structured object:
`event_type, location, severity, start_date, estimated_duration,
affected_routes, affected_suppliers, affected_products, confidence`
(exact fields from §13). `validate_event()` is plain Python — schema check,
range check (dates sane, severity in the allowed enum, confidence in [0,1]) — and
runs **after** the LLM call and **before** anything touches world state. A
candidate that fails validation is rejected and logged, never silently coerced.
This is the concrete mechanism behind "the LLM must not directly modify
supply-chain data": it can't, because nothing it returns is a database write —
it's an argument to a validator.

**Implemented (Phase 13).** `SensingAgent.sense(raw)` returns a `SensingResult`
whose status is `EVENT`, `NO_DISRUPTION` (the text describes no supply-chain
disruption — not an error), `REJECTED` (bad input, or a candidate that failed
`validate_event`; `INVALID_SENSING_OUTPUT`) or `ERROR` (LLM unreachable;
`LLM_UNAVAILABLE`). Input is free text, or a simulated-trigger mapping that may
carry a pre-structured candidate (skips the LLM, never the validator). The
validator's limits are in `backend/config/sensing_config.yaml`; the model and key
come from `LLM_MODEL` / `LLM_API_KEY`. The result carries the LLM's raw candidate
for the audit trail, and a rejected candidate is logged with every reason.
`affected_routes` / `affected_suppliers` mean what the event *blocks or curtails*,
and what an event does to the state depends on its type
(`world_state/events.py: EVENT_EFFECTS`) — a tariff or demand event never
blocks a lane.

## Inventory Agent

Tools: `get_inventory()`, `forecast_demand()`, `calculate_stockout_risk()`,
`calculate_transfer_recommendation()`.

`forecast_demand()` calls the served XGBoost model (model-plan.md §6) — the agent
itself contains no ML code, only orchestration of the call plus the
business logic in §8 of the brief: days-of-cover, projected inventory, stockout
flag, transfer recommendation. Output shape (from the brief, verbatim):

```json
{
  "warehouse": "Mumbai",
  "product": "P001",
  "forecast_demand": 5600,
  "current_stock": 3100,
  "stockout_risk": "HIGH",
  "recommended_transfer": { "from": "Delhi", "quantity": 2500 }
}
```

Never executes the transfer — `recommended_transfer` is an input to the
Optimization Engine, which decides whether it's actually part of the final plan
once all constraints are considered together.

## Logistics Agent

Tools: `get_routes()`, `check_route_capacity()`, `calculate_transport_cost()`,
`calculate_eta()`, `generate_alternative_routes()`.

Given the current `route_status` in world state (e.g. Suez = BLOCKED),
`generate_alternative_routes()` proposes a ranked set of substitutes (Cape of
Good Hope, rail corridor, air) each with cost/time/capacity already computed by
the other tool functions — not the optimization engine's job to discover routes,
only to choose among the ones this agent surfaces. Produces a proposed logistics
plan (candidate routes + their metrics), never mutates `SHIPMENTS` directly.

## Sourcing Agent

Tools: `get_suppliers()`, `check_supplier_capacity()`,
`calculate_supplier_cost()`, `calculate_landed_cost()`,
`generate_supplier_options()`.

`calculate_landed_cost()` folds in `TARIFFS` for the supplier's origin country —
this is the one place tariff data directly affects a recommendation before
optimization even runs, which matters for the "Tariff Increase" scenario.
Output shape (from the brief):

```json
{ "supplier_allocations": [ { "supplier_id": "S001", "quantity": 5000 },
                             { "supplier_id": "S002", "quantity": 3000 } ] }
```

Again a recommendation, ranked by risk/cost/capacity — the Optimization Engine
makes the final allocation call jointly with logistics and inventory.

## Compliance Agent

Tools: `check_supplier_policy()`, `check_country_policy()`,
`check_transaction_threshold()`, `validate_plan()`.

**Deterministic only — no LLM in this agent, by explicit instruction (§12).**
Rules live in `backend/config/compliance_rules.yaml` (configurable, not
hardcoded across the codebase, per §12's own instruction), e.g.:

```yaml
rejected_suppliers: []        # sanctioned-supplier list
restricted_countries: []
approval_threshold_inr: 5000000
```

`validate_plan()` runs the four checks in order and returns:

```json
{ "status": "APPROVED | REJECTED | ESCALATED",
  "checks": [ { "name": "...", "passed": true } ],
  "reason": "...", "requires_human": true }
```

A plan with no violations and under threshold is `APPROVED` (no human step
needed — this is what "the AI system does NOT blindly execute high-impact
decisions" is contrasted against: *low*-impact, in-policy actions are allowed to
proceed automatically; the escalation path exists specifically for the
high-impact case). Over threshold → `ESCALATED`. Any hard violation → `REJECTED`.

## Optimization Engine (not an agent — see architecture.md §1/§4)

Explicitly not called an "agent" per the brief's own instruction. Consumes the
Inventory/Logistics/Sourcing recommendations as its input problem, not as
suggestions it can ignore arbitrarily — it may deviate from a single agent's
recommendation only when a hard constraint (capacity, deadline) forces it to, and
the deviation is recorded in the explanation surfaced to the Decision Center UI.
Tools: `build_optimization_problem()`, `optimize_supply_chain()`,
`validate_solution()`, `get_optimization_metrics()`. Full interface in
architecture.md §4.

## Orchestration routing (the state machine architecture.md §3 refers to)

```
sense → validate → update_state
  → [inventory, logistics, sourcing] (independent, can run concurrently)
  → build_optimization_problem → optimize_supply_chain
  → compliance.validate_plan
       APPROVED   → (auto-)finalize → update_state → END
       ESCALATED  → human_approval_pending → update_state → WAIT
                       on Approve → finalize → update_state → END
                       on Reject  → update_state("plan_rejected_by_human") → END
       REJECTED   → record_failing_constraint → build_optimization_problem
                       (bounded: max 1 replan attempt, then END with
                        status="infeasible_after_replan" — never loops silently)
```

The one-replan cap exists so a persistently REJECTED plan produces a clear
terminal state instead of retrying forever — matches §22's "never silently
return a fake successful result."

**As built (Phase 14).** The three agents run in dependency order rather than concurrently
(Sourcing is sized to Inventory's deficit; Logistics is asked about the ports Sourcing's
suppliers ship from). "Record the failing constraint" means the rejecting checks' structured
`offenders`; a restricted country excludes every supplier in it. A rejection that names nothing
to exclude fails immediately, since replanning would reproduce the same plan. The terminal
error strings are `infeasible_after_replan`, `rejected_after_replan` and `compliance_rejected`.

## Mapping to SAP Joule Studio (production, documented not implemented)

Each agent above is written as a class exposing exactly the tool functions
listed — that's deliberate, because SAP Joule Studio's Agent Builder (GA
January 2026) composes agents from named "skills" wired via MCP with the same
plan → call-tool → produce-output shape, plus built-in governance/audit trail and
principal propagation (the calling user's identity/authorization flows through
every tool call). Porting an MVP agent means registering its tool functions as
Joule skills — the tool signatures below don't change, only who's allowed to call
them and how the call is authenticated.
