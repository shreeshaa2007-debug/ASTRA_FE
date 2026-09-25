# ResilientSC — Architecture (Phase 1)

## 0. Status

Greenfield project. No pre-existing repository was found under the user's workspace
for this SAP Hackfest submission, so this document defines the architecture from
scratch rather than adapting existing code. A separate frontend concept (the
"ResilientSC" command-center UI) was scoped in an earlier conversation as a
standalone HTML artifact; it is now `frontend/` in this repo. The backend serves the
real API of [api-plan.md](api-plan.md) (Phase 15), and every screen of the UI reads it
(Phase 16); nothing on screen is fixture data.

## 1. What this system is

An AI-assisted decision-support system for supply-chain disruptions. It does not
autonomously execute high-impact changes. It senses a disruption, updates one
shared state, runs four specialist agents that each produce a *recommendation*
(never a write), an optimization engine that turns those recommendations into one
feasible plan, a deterministic compliance check, and a human approval gate before
anything is marked "final."

```
DISRUPTION
  → SENSING AGENT            (LLM: unstructured → structured event, validated)
  → SHARED WORLD STATE update
  → INVENTORY AGENT          (XGBoost forecast → stockout risk, transfer reco)
  → LOGISTICS AGENT          (route status/capacity/cost → alternative routes)
  → SOURCING AGENT           (supplier status/capacity/cost → sourcing mix)
  → OPTIMIZATION ENGINE      (feasible min-cost plan across the above)
  → COMPLIANCE AGENT         (deterministic rules → APPROVE/ESCALATE/REJECT)
  → HUMAN APPROVAL           (required for ESCALATED; skipped only for auto-APPROVED
                               low-impact actions, per configurable threshold)
  → FINAL RESPONSE → SHARED WORLD STATE update
```

REJECTED does not end the run — it routes back to OPTIMIZATION with the failing
constraint recorded, for one bounded replan attempt (see
[agent-plan.md § Orchestration routing](agent-plan.md)).

## 2. Component map — MVP vs. production SAP

The hackathon environment gives us no provisioned SAP BTP subaccount, so nothing
below labeled "MVP" talks to a real SAP service. Every MVP component is built
behind an interface shaped like its SAP production replacement, so swapping the
implementation later is a config change, not a rewrite. This table is the concrete
answer to the "do not fake an SAP execution" constraint — grounded in what these
SAP services actually do today, not assumed:

| Capability | MVP implementation (this repo) | Production SAP replacement | Why that mapping |
|---|---|---|---|
| API / business service layer | Python **FastAPI** app, REST, matches [api-plan.md](api-plan.md) exactly | **SAP CAP** (Node.js) service on BTP, same endpoint contract | CAP is SAP's native app-programming model for BTP; FastAPI is used for MVP because CAP has no first-class path to host the Python ML/optimization code below, so production would be CAP-as-facade calling an AI Core-hosted inference service — same split as MVP, different transport |
| Orchestrator | Hand-rolled Python state machine (`backend/orchestration`), explicit steps + conditional routing | **SAP Build Process Automation** for the human-task/approval leg; **SAP Integration Suite, advanced event mesh** for the event-driven leg between steps | SBPA is SAP's workflow engine with native human-approval tasks; Advanced Event Mesh is SAP's pub/sub backbone — confirmed current capability, not a guess |
| Sensing / Inventory / Logistics / Sourcing / Compliance agents | Python classes, one per agent, each exposing the exact tool functions listed in [agent-plan.md](agent-plan.md) | **SAP Joule Studio Agent Builder** agents (GA Jan 2026), same tool contracts exposed via MCP, orchestrated with SAP's built-in governance/audit trail and principal propagation | Joule Studio's agent builder is SAP's current low-code agent canvas for exactly this shape of "plan → call tools → produce a recommendation" agent; the Python tool signatures are written so they map 1:1 onto Joule "skills" later |
| Demand forecasting | **XGBoost** (Python), trained offline, served from a local artifact | **SAP AI Core** hosted deployment of the same model (AI Core explicitly supports scikit-learn/XGBoost-family models via containerized serving with an HTTP endpoint) — *or*, if the org already licenses it, **SAP HANA Cloud PAL/APL** in-database time-series forecasting (90+ algorithms incl. gradient boosting and Prophet-style additive models) | AI Core is the lift-and-shift path for our exact model; PAL/APL is the alternative if the customer wants forecasting to live in the database instead of a served model — both are real, both documented so the team can pick later |
| Optimization engine | `scipy.optimize.linprog` (HiGHS solver, MILP via the `integrality` argument), wrapped behind an `OptimizationEngine` interface (§4) | **SAP Integrated Business Planning (IBP), Response & Supply Planning** | IBP is SAP's licensed supply/response optimization product; we do not have a license or environment for it in this hackathon, so we do not call it or claim to. The interface is written so a `SAPIBPOptimizationEngine` class can implement the same three methods later with zero caller changes |
| Shared world state persistence | In-process store, snapshotted to **SQLite** file per simulation | **SAP HANA Cloud** tables | Swap the persistence adapter only; the state schema (§5) is written to be a valid HANA Cloud table design from day one |
| Shipment/supplier/inventory/route data | Flat files in `data/processed`, loaded into SQLite | SAP HANA Cloud / S/4HANA extension tables | n/a — MVP-only concern |

**What this buys us:** the frontend (and every test) talks to the same REST
contract regardless of which row above is "real." Section 11
(`OptimizationEngine`) is the sharpest example — the prompt for this project
explicitly says the frontend must never know if optimization is simulated or
production SAP, and that is enforced by making both implementations satisfy one
Python `Protocol`.

## 3. Why not the frameworks called out as off-limits

The brief rules out LangGraph/LangChain/CrewAI/AutoGen, PuLP/OR-Tools/Gurobi/CPLEX,
and external optimization SaaS by default, since SAP Hackfest rules prioritize
SAP-native services. Concretely:

- **Orchestration**: no LangGraph/CrewAI. The orchestrator is ~150 lines of
  explicit Python (a step list + a routing function keyed on compliance status),
  because the actual requirement — DAG with one conditional replan edge — does not
  need a framework, and a hand-rolled state machine is the same shape SAP Build
  Process Automation would model as a flow with a decision gateway (so the mental
  model transfers directly to the SBPA production version).
- **Optimization**: no PuLP/OR-Tools/Gurobi/CPLEX. `scipy.optimize.linprog` is
  used instead — it is a general scientific-computing library already standard in
  the Python data stack (not an optimization framework or SaaS on the banned
  list), ships the open-source HiGHS solver in-process, and supports mixed-integer
  problems via `integrality`. This is flagged explicitly in
  [model-plan.md](model-plan.md) as a judgment call, in case hackathon rules turn
  out to permit OR-Tools — it's a one-file swap if so.
- **LLM agent execution**: the Sensing Agent's LLM call only *proposes* a
  structured event (schema-validated before it touches world state); it never
  calls a tool that writes. This satisfies §13's "LLM must not directly modify
  supply-chain data" without needing a heavier agent framework to enforce it —
  it's enforced by the orchestrator, not by the agent.

## 4. Optimization Engine interface (the abstraction §11 asks for)

```python
class OptimizationEngine(Protocol):
    def optimize_supply_chain(self, problem: OptimizationProblem) -> OptimizationSolution: ...
    def validate_solution(self, solution: OptimizationSolution) -> ValidationResult: ...
    def get_objective_value(self, solution: OptimizationSolution) -> float: ...
    def get_constraint_status(self, solution: OptimizationSolution) -> list[ConstraintStatus]: ...
```

`PrototypeOptimizationEngine` (Phase 10) implements this with `linprog`.
`SAPIBPOptimizationEngine` (documented, not implemented — no licensed environment
available) would implement the same four methods against IBP's API. Every response
the API returns includes `"engine": "prototype" | "sap_ibp"` so the frontend can
render a "Prototype Optimization" badge without knowing anything else about which
engine ran (see [api-plan.md](api-plan.md) response envelope).

### 4.1 Prototype formulation (Phase 10)

`backend/optimization/` — one product at a time. Whole-unit variables:
`x[supplier, route]` (units bought and shipped), `t[a, b]` (warehouse transfers),
`inbound[w]` (procured stock delivered to warehouse *w*).

```
minimize   Σ (landed_cost + freight + delay_penalty)·x  +  transfer_cost·Σt
subject to supplier capacity        Σ_r x[s,r]  ≤ capacity[s]
           route capacity           Σ_s x[s,r]  ≤ capacity[r]         (shared across suppliers)
           inbound balance          Σ x  =  Σ_w inbound[w]
           safety stock (each w)    stock + inbound + t_in − t_out − ⌈forecast⌉  ≥  safety
           transfer availability    t_out[w]  ≤  stock[w]
           delivery deadline        lanes with lead time + transit > max_delivery_days are not offered
```

Solved as a MILP with HiGHS (`scipy.optimize.linprog(integrality=…)`). The
integer variables are unit quantities only — there are no binary decisions,
because the data has no fixed charges or minimum order sizes. Landed cost
already includes the Sourcing Agent's tariff term; the objective reports
procurement, tariff, freight, transfer and delay-penalty separately. Every
`OPTIMAL` plan is re-checked by `validation.py`, which shares no code with the
matrix assembly, before it is returned; an infeasible problem returns
`INFEASIBLE` with the shortfall, the exhausted limits and a recovery hint, never
a plan.

**Modeling assumptions** — the four processed datasets were built
independently and do not connect on their own, so the engine needs these
(all in `backend/config/optimization_config.yaml`, all echoed in each problem's
`assumptions`):

| Assumption | Why it is needed | Consequence |
|---|---|---|
| Every route ends at Rotterdam, the **inbound hub**; inbound stock is available to every warehouse for free | routes.csv only has Rotterdam-bound lanes, but the inventory ledger's warehouses are Mumbai/Chennai/Delhi | Onward distribution is unmodeled; the biggest inconsistency in the data, inherited from Phases 3/6 |
| Each supplier ships from one **origin port** (`supplier_origin_port`) | suppliers.csv has only a country | A closed route strands the suppliers behind it — that is the mechanism that makes a Suez closure change the sourcing mix |
| Suppliers with `null` port (Turkey, Netherlands) have **no freight leg**: cost 0, transit 0 | no route to Rotterdam exists for them | Flatters them against suppliers that pay freight — flagged in `assumptions` |
| Planning horizon 45 days, single period | overseas lead time + transit is 15–40 days; the 14-day forecast horizon can never justify an overseas order | No stock-out timing inside the horizon; hard deadline defaults to the horizon |
| Transfer cost 5/unit, 2 days | no inter-warehouse freight data | Placeholder; only its size relative to procurement (~100+/unit) matters |
| Supplier reliability/risk are reported, not priced | no basis in the data for a risk premium | A DISRUPTED supplier is simply unavailable; a 0.63-reliability supplier is not penalized |

## 5. Shared World State

One object, one owner (the orchestrator), read by every agent, written only at
named checkpoints (never mid-agent). Fields, per §14:

```
current_disruptions, route_status, supplier_status, inventory_status,
demand_forecasts, shipment_status, tariffs, current_plan, compliance_status,
approval_status, simulation_id, timestamp
```

MVP: one row per `simulation_id` in SQLite, full state as JSON plus indexed columns
for `simulation_id`/`status`/`timestamp` so `GET /api/simulations/{id}` doesn't
deserialize-and-filter in Python. Production: the same shape as a SAP HANA Cloud
table; JSON columns map to HANA's native JSON document store, indexed columns stay
indexed columns.

Simulations are isolated by `simulation_id` — running "Suez Canal Closure" and
"Major Supplier Failure" concurrently never share mutable state, per §14's
CREATE/GET/UPDATE/RESET requirement.

### 5.1 Implemented (Phase 12)

`backend/schemas/world_state.py` (the state), `backend/database/` (the adapter),
`backend/services/world_state/` (store, checkpoints, baseline). One row per
`simulation_id` in `world_states` — full state as JSON, plus indexed
`status`/`updated_at` columns — and an append-only `world_state_checkpoints`
audit trail (which is also what the Agent Monitor timeline reads). §2's
"snapshotted per simulation" is realized as this one-row-per-simulation table.

**Agents never write.** `store.get()` deserializes a fresh copy on every call,
so nothing an agent does to the object it was handed reaches the stored state.
The only write is `store.commit(simulation_id, checkpoint, changes)`, and each
named checkpoint owns a fixed set of fields, a set of legal source statuses, and
an invariant checked against the resulting state:

| Checkpoint | Owns | From → to | Invariant |
|---|---|---|---|
| `event_sensed` | disruptions, route/supplier status, tariffs | CREATED → RUNNING | at least one disruption |
| `agents_assessed` | inventory, forecasts, shipments | RUNNING | — |
| `plan_optimized` | current_plan | RUNNING | plan present (an INFEASIBLE plan is kept for its diagnosis) |
| `compliance_checked` | compliance_status | RUNNING | the plan is OPTIMAL |
| `approval_requested` | approval_status | RUNNING → AWAITING_APPROVAL | compliance ESCALATED it to a human |
| `plan_finalized` | approval_status/decision | RUNNING or AWAITING_APPROVAL → COMPLETED | plan OPTIMAL; compliance did not REJECT it; **if compliance escalated it, a named human approved it after it was sent for approval** |
| `plan_rejected_by_human` | approval_status/decision | AWAITING_APPROVAL → REJECTED | rejection has a named decider |
| `replan_requested` | plan, compliance, replan_count | RUNNING | compliance REJECTED it; `replan_count` ≤ `MAX_REPLANS` (1); plan and verdict cleared |
| `run_failed` | error | any open status → FAILED | non-empty error |

COMPLETED, REJECTED and FAILED are terminal; only `reset()` leaves them. So the
"AI does not blindly execute high-impact decisions" rule and the bounded replan
hold in the state itself, whatever the orchestrator does. Phase 14 adds a
checkpoint by adding a `CHECKPOINTS` entry.

`reset()` restores the state the simulation was *created* with (stored at
creation), not whatever the data files say later, keeps the audit trail and
keeps incrementing `version`. `commit(..., expected_version=n)` and the
repository's compare-and-swap on `version` turn two writers racing on one
simulation into one winner and a `STATE_CONFLICT`, never a silent overwrite.
The database comes from `DATABASE_URL`; the repository sits behind the
`WorldStateRepository` Protocol, so SAP HANA Cloud is a different adapter, not
a different store.

### 5.2 Implemented (Phase 14): the orchestrator

`backend/orchestration/orchestrator.py`. `run()` executes, in order: **sense →
validate → agents → optimize → compliance**, then routes on the compliance
verdict; each stage that changes the world state does so through the §5.1
checkpoint of the same name, passing `expected_version` so a concurrent writer
turns into an error rather than an overwrite.

```
APPROVED   -> plan_finalized (approval NOT_REQUIRED)                    COMPLETED
ESCALATED  -> approval_requested                                        AWAITING_APPROVAL
                 approve(name) -> plan_finalized (APPROVED, named)      COMPLETED
                 reject(name)  -> plan_rejected_by_human                REJECTED
REJECTED   -> replan_requested -> agents rerun with the verdict's offenders excluded, ONCE
                 still rejected / no longer feasible / nothing to exclude  -> run_failed   FAILED
```

The world state is what the agents are told, not the data files: disrupted
routes and suppliers and the tariffs in effect are read from the state and
passed to the Logistics, Sourcing and Compliance agents, so a sensed supplier
failure or a scenario's tariff change changes the plan. A tariff's *amount*
isn't part of a sensed event (brief §13), so a scenario supplies it through
`run(..., tariff_overrides=…)`.

Sensing outcomes other than an event (`NO_DISRUPTION`, a rejected candidate, an
unreachable LLM) put nothing in the state and leave the simulation CREATED, so
the same simulation can be run again. Only a pipeline failure ends in `FAILED`,
and an unexpected exception is recorded as one — a run never hangs in RUNNING
because of an error it caught. It is one product per run, because the state
holds one `current_plan`.

### 5.3 Implemented (Phase 15): the API layer

`backend/api/` (`create_app()` with injectable services, so tests swap in a fake LLM,
an in-memory database and synchronous runs). Handlers are thin; `views.py` holds pure
response builders. Background runs go through `RunRegistry` (one per simulation,
worker threads, in-memory records). Two rules about *concurrency* came out of testing
against a run that is writing while it is being read:

* **Status is read coherently.** Agent status is derived from the world state alone
  (the checkpoint history is only the timeline), and `read_status` reads the run flag
  and snapshots the run record *before* the state, so the only possible skew is a run
  that looks older than the state — never a finished run beside a RUNNING one.
* **HiGHS lives on one thread.** scipy's bundled HiGHS hangs or faults when solves run
  on threads that then exit, and the API runs solves on worker threads. Every solve is
  therefore handed to one permanent daemon thread (`engine._SolverThread`); solves are
  serialized, which at milliseconds each costs nothing here.

The consequence to plan around: run **one** uvicorn worker. The in-flight guard and the
run records are per-process; the world state (the SQLite database) is what is shared.

### 5.4 Implemented (Phase 19): observability and failure handling

`backend/monitoring/`, and instrumentation in the code that decides things. Nothing here decides anything; it watches.

* **Logging.** Until this phase the code logged but nothing configured a handler, so under uvicorn every INFO
  line (the per-step run log included) was dropped. `configure_logging` (idempotent, attached to the `resilientsc`
  logger only) writes text or JSON lines and stamps each with the `request_id`, `simulation_id` and `run_id` it is
  about — three context variables, carried across the run's worker thread by copying the context at `RunRegistry.start`.
  Structured fields go in `extra=` (`event`, `step`, `checkpoint`, `duration_ms`…). Every store change logs a
  `checkpoint` line (the audit trail's twin), every step a `step` line, every request one `request` line (polled
  endpoints at DEBUG). A redaction filter removes the value of any secret-looking environment variable from a line.
* **Correlation.** A middleware gives each request an id (the caller's `X-Request-ID` if it is a sane one — never
  echo what could forge a log line), returns it as a header, and puts it in the error envelope, so "what went wrong"
  is answered by quoting one string.
* **Metrics.** An in-process registry (`metrics.py`): counters, gauges, and latency summaries with a bounded window
  for p50/p95, as JSON and as Prometheus text. HTTP is labelled by route *template*, not path, so a thousand simulations
  are one series. Per-process, like the run registry: one worker, or scrape each.
* **Model monitoring** (`model_monitor.py`, docs/model-plan.md §8): per prediction the count, latency, version and
  missing-feature rate; per forecast a drift warning (the recent demand window's mean, in standard deviations of that
  product's training-time 28-day means — one threshold, per product, once per transition); and `backtest`, the
  prediction error once actuals are known. On this data it fires for real: the model never saw a Q4 ramp.
* **Failure handling.** `GET /api/ready` separates *alive* from *ready* (database, datasets, model artifact; the LLM and
  its circuit are optional, so a missing key is degraded, not down). `CircuitBreakerLLM` stops calling a provider after
  N consecutive failures for a cooldown, so a queue of runs does not each hold a worker for retries x timeout. A database
  that cannot be reached is a 503 `DATABASE_UNAVAILABLE` with no SQL in the body. A run past `overdue_seconds` is reported
  `overdue` (nothing kills it — a thread cannot be interrupted safely — but it can be seen).

## 6. Repository layout

```
ResilientSC/
├── backend/
│   ├── api/                  REST layer (FastAPI routers), Phase 15
│   ├── agents/                sensing/ inventory/ logistics/ sourcing/ compliance/
│   ├── optimization/          OptimizationEngine + PrototypeOptimizationEngine
│   ├── models/forecasting/    XGBoost train/predict wrapper, versioned artifacts
│   ├── tools/                 the controlled tool functions agents call (§16)
│   ├── services/               cross-cutting: world-state store, config, logging
│   ├── schemas/                 pydantic models = the internal schemas in §5 of the brief
│   ├── database/                 SQLite adapter now, HANA Cloud adapter later, same interface
│   ├── simulation/                 scenario definitions + generic disruption framework (§19)
│   ├── orchestration/               the state machine (§15)
│   ├── monitoring/                    structured run logs, drift stub (§20, §26)
│   ├── tests/
│   └── config/                          env-driven settings, no hardcoded secrets (§23)
├── data/{raw,interim,processed}/        per data-plan.md
├── ml/{training,evaluation,artifacts}/  per model-plan.md
└── docs/                                 this file + implementation/data/model/agent/api plans
```

This departs from the brief's suggested layout only by nesting `models/`,
`tools/`, etc. under `backend/` instead of at repo root — keeps the Python package
boundary (`backend`) unambiguous for imports and tests. Everything the brief asked
for is present.

## 7. What Phase 1 deliberately does not include

No application code, no dataset downloads, no trained model, no live SAP
connection. Those are Phases 2–16. This document, plus
[implementation-plan.md](implementation-plan.md), [data-plan.md](data-plan.md),
[model-plan.md](model-plan.md), [agent-plan.md](agent-plan.md) and
[api-plan.md](api-plan.md), are the complete Phase 1 output.

## Sources consulted for the SAP capability claims above

- [Agent builder in Joule Studio is now generally available](https://community.sap.com/t5/artificial-intelligence-blogs-posts/agent-builder-in-joule-studio-is-now-generally-available-build-your-own/ba-p/14289282)
- [Build AI Agents on SAP BTP — SAP Architecture Center](https://architecture.learning.sap.com/docs/golden-path/ai-golden-path/build-and-deliver/build-ai-agents)
- [SAP Generative AI Hub: Extending Joule with Custom Skills & AI Agents](https://community.sap.com/t5/artificial-intelligence-blogs-posts/sap-generative-ai-hub-extending-joule-with-custom-skills-amp-ai-agents-part/ba-p/14354559)
- [Integrating SAP Integration Suite with SAP Build Process Automation](https://learning.sap.com/courses/discovering-enterprise-automation-with-sap/integrating-sap-integration-suite-with-sap-build-process-automation)
- [Advanced Event Mesh — SAP Integration Suite](https://www.sap.com/products/technology-platform/integration-suite/advanced-event-mesh.html)
- [New Machine Learning and AI features in SAP HANA Cloud 2025 Q4](https://community.sap.com/t5/technology-blog-posts-by-sap/new-machine-learning-nlp-and-ai-features-in-sap-hana-cloud-2025-q4/ba-p/14293152)
- [Serving an ML Model — SAP AI Core learning journey](https://learning.sap.com/learning-journeys/learning-how-to-use-the-sap-ai-core-service-on-sap-business-technology-platform/serving-an-ml-model_d19970b5-1a04-436f-bc88-032b4af2ae69)
- [SAP Integrated Business Planning — Response and Supply Planning](https://www.sap.com/products/scm/integrated-business-planning/features/response-and-supply-planning.html)
