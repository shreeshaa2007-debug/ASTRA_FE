# ResilientSC — API Plan (Phase 1)

REST, JSON, FastAPI (architecture.md §2). Every endpoint below is a sketch —
final field names get locked in Phase 15 against the pydantic schemas built in
Phase 12 (`backend/schemas/`), not invented twice.

## Response envelope

Every response carries a thin, consistent envelope so the frontend never has to
special-case which layer produced an error, per §22:

```json
// success
{ "data": { ... } }

// error — never a silent fake success
{ "error": { "status": "error", "error_code": "OPTIMIZATION_INFEASIBLE",
             "message": "No feasible plan under current route/supplier capacity.",
             "recovery": "Relax delivery deadline or add a supplier alternative." } }
```

## Endpoints

| Method & path | Purpose | Notes |
|---|---|---|
| `POST /api/simulations` | Create a simulation for a scenario (`scenario_type`, e.g. `SUEZ_CLOSURE`) | Returns `simulation_id`; initializes that simulation's isolated world state (architecture.md §5) |
| `GET /api/simulations/{id}` | Fetch full world state for a simulation | |
| `POST /api/simulations/{id}/run` | Executes the orchestration pipeline (agent-plan.md § Orchestration routing) | Async — kicks off the run; poll status below. Long-running steps stream via the status endpoint rather than blocking the HTTP call |
| `GET /api/simulations/{id}/status` | Current step, per-agent status, whether awaiting human approval | Backs the Agent Monitor page's live timeline |
| `GET /api/dashboard` | Aggregate KPIs (active disruptions, shipments at risk, inventory risk, supplier health, estimated exposure) | Reflects the **latest finalized** simulation, not an in-progress one |
| `GET /api/disruptions` | List/detail of current and historical disruption events | |
| `GET /api/inventory` | Warehouse-level inventory table | Backs Inventory Intelligence page |
| `GET /api/inventory/forecast` | Demand forecast series (actual + predicted + confidence band) | Wraps `POST /api/forecast` (model-plan.md §6) for chart consumption |
| `GET /api/suppliers` | Supplier table + recommended sourcing mix | |
| `GET /api/routes` | Route/network table + status | Backs Logistics Network page |
| `GET /api/shipments` | Shipment list, filterable by simulation/route/status | Drives the shipment detail drawer |
| `GET /api/agents/status` | Per-agent current status + execution timeline | |
| `GET /api/decisions/{id}` | Full decision explanation: factors, recommended split, objective terms, constraints satisfied | Backs AI Decision Center |
| `GET /api/compliance/{id}` | Compliance checklist result for a given plan | |
| `POST /api/decisions/{id}/approve` | Human approves an escalated plan | Triggers `finalize` in the routing state machine |
| `POST /api/decisions/{id}/reject` | Human rejects | Triggers terminal `plan_rejected_by_human` state |
| `GET /api/scenarios` | The defined scenarios (Suez closure, supplier failure, severe weather, tariff increase, and two that say why they are not modeled) | Phase 17; definitions live in `backend/config/scenarios.yaml` |
| `GET /api/scenarios/{id}/comparison` | Baseline vs. unmitigated vs. mitigated for one product (`?product_id=`, `?as_of_date=`) | Phase 17; read-only, deterministic, cached |
| `POST /api/scenarios/{id}/run` | Creates a simulation for the scenario and runs the full pipeline on it, with no LLM call | Phase 17; 202 + `status_url`, like `/run` |
| `GET /api/simulations/{id}/comparison` | The same three-way comparison for a simulation's own disruption, using its actual plan as the mitigated case | Phase 17; 409 `PLAN_NOT_READY` before there is a plan |
| `GET /api/ready` | Readiness: can this process do its job? 200, or 503 naming the failing dependency | Phase 19; `/api/health` stays the cheap liveness probe |
| `GET /api/metrics` | Counters, gauges and latency summaries for this process (`?format=prometheus` for the text format) | Phase 19; per-process |
| `GET /api/monitoring/model` | The demand model's health: inferences, latency, version, missing-feature rate, drift warnings, backtests (`?backtest_product_id=`) | Phase 19 |
| `GET /api/products` | The 40 ledger products and how many suppliers each has | Phase 17; only three have any, so only those can be planned |
| `GET /api/me` | Who the API thinks you are and which scopes you hold | Phase 21; with authentication off, an anonymous caller holding every scope |
| `POST /api/integration/signals` | A disruption reported by another system (an SAP Integration Suite flow): starts the pipeline on it | Phase 21; scope `Operate`; idempotent per (`source_system`, `external_id`): 202 the first time, 200 `duplicate: true` on a redelivery |

## What every response includes, regardless of endpoint

- `"engine": "prototype" | "sap_ibp"` on anything optimization-derived, and a
  `"label": "Prototype Optimization"` string the frontend can render verbatim —
  this is the literal mechanism behind "the frontend must never know whether
  optimization is simulated or production SAP" (architecture.md §2/§4): the
  frontend renders the label, it doesn't infer it.
- `"model_version"` on anything forecast-derived.
- `"simulation_id"` on anything simulation-scoped, so the frontend can run
  Suez-closure and supplier-failure scenarios side by side without state bleeding
  between them.

Every response carries `X-Request-ID` (send your own, `[A-Za-z0-9._-]{1,64}`, to correlate), and every
error envelope carries `request_id` — the id on the backend's log lines for that request. A run's status
has `run.elapsed_ms` and `run.overdue`.

## Error codes

As built in Phase 15. Every error is the envelope above, with a `recovery` hint;
the HTTP status is what a client should branch on.

| Code | HTTP | When |
|---|---|---|
| `SIMULATION_NOT_FOUND` | 404 | unknown `simulation_id` |
| `NOT_FOUND` / `METHOD_NOT_ALLOWED` | 404 / 405 | unknown path / wrong method |
| `VALIDATION_ERROR` | 422 (409 for a duplicate id) | a bad request; the message names the field |
| `INVALID_STATE_TRANSITION` | 409 | the simulation's status doesn't allow this (e.g. running a COMPLETED one; approving what isn't waiting) |
| `STATE_CONFLICT` | 409 | `expected_version` is stale: the plan changed since you read it |
| `CHECKPOINT_VIOLATION` | 409 | a state rule refused the write |
| `RUN_IN_PROGRESS` | 409 | a run (or a reset during one) on a simulation that is already running |
| `DATABASE_UNAVAILABLE` | 503 | the world-state database cannot be reached (no SQL is echoed); `GET /api/ready` says which dependency |
| `SCENARIO_NOT_FOUND` / `SCENARIO_NOT_MODELED` | 404 / 422 | an unknown scenario id / a scenario the pipeline cannot represent yet (the message says why) |
| `PLAN_NOT_READY` | 409 | `/decisions` or `/compliance` before there is a plan / a verdict |
| `DATASET_UNAVAILABLE` / `MODEL_UNAVAILABLE` | 503 | a reference dataset (a file, or a `ref_*` table) / the forecasting artifact isn't there |
| `UNAUTHENTICATED` | 401 | authentication is on and no valid bearer token was sent (with `WWW-Authenticate: Bearer`; the message never says which check failed) |
| `FORBIDDEN` | 403 | the token is valid but lacks the scope this endpoint needs (`view`, `operate` or `approve`) |
| `AUTH_UNAVAILABLE` | 503 | the identity provider's signing keys could not be fetched |
| `LLM_UNAVAILABLE` | 503 | (surfaces in a run's outcome as `SENSING_ERROR`) the LLM can't be reached or no key is set |
| `INTERNAL_ERROR` | 500 | anything unexpected; logged, never echoed |

`OPTIMIZATION_INFEASIBLE`, `INVALID_SENSING_OUTPUT` and `COMPLIANCE_REJECTED` are
not HTTP errors: a run is asynchronous, so they arrive as a finished run's
outcome / a FAILED simulation's `error` (`GET …/status`), and an infeasible plan is
still a 200 on `/api/decisions/{id}` with `plan_status: "INFEASIBLE"` and its
diagnosis — an explanation of "no feasible plan" is data, not a failure to fetch it.
`SAP_SERVICE_UNAVAILABLE` stays reserved for a real SAP integration.

## As built (Phase 15)

Beyond the table above: `GET /api/simulations` (list, `?status=`), `POST
/api/simulations/{id}/reset`, and `POST /api/forecast` (model-plan.md §6). JSON is
snake_case. `GET /api/health` reports `llm_configured` (a boolean, never the key).

**Scoping.** `/api/dashboard`, `/api/disruptions` and `/api/shipments` follow the
*latest finalized* simulation unless `simulation_id` names one; `/api/routes`,
`/api/suppliers` and `/api/inventory` show the *baseline network* unless
`simulation_id` overlays a simulation's state on it.

**A run.** `POST /api/simulations/{id}/run` takes `{signal, product_id, as_of_date?,
tariff_overrides?}` — `signal` is free text or a simulated trigger — and returns 202
immediately. Poll `GET …/status`: `status`, `current_step`, `awaiting_approval`,
`stalled` (a simulation RUNNING with no run behind it, i.e. after a restart), the
latest `run` (`RUNNING`/`FINISHED`/`CRASHED` plus the orchestrator's outcome and
step timings), `agents[]` (`PENDING`/`RUNNING`/`COMPLETE`/`FAILED`/`NO_EVENT`/
`ACTION_REQUIRED`/`NOT_REQUIRED`/`REJECTED`) and the full `timeline` audit trail.
When sensing finds nothing to act on, the simulation stays CREATED and the run's
outcome (`NO_DISRUPTION`, `SENSING_REJECTED`, `SENSING_ERROR`) says why.

**Approval.** `POST /api/decisions/{id}/approve|reject` takes `{decided_by, note?,
expected_version?}`. Send the `version` you were shown; a plan that has since
changed is refused (`STATE_CONFLICT`) rather than approved unseen.

**What is not there, on purpose.** No shipment dataset, so `/api/shipments` lists
the shipments the plan *proposes* (`PROPOSED` until finalized, then `PLANNED`);
forecasts are point forecasts with `confidence: null`. Since Phase 17 the dashboard's
`shipments_at_risk` / `estimated_exposure` are the purchases in the *modeled baseline
plan* that the latest finalized simulation's disruption invalidates, and that plan's own
price for them — never observed shipments, never a loss estimate (`exposure_note` says so);
they are still null, with the reason in `unavailable`, when nothing is finalized, the plan
is infeasible, or the run used an earlier as-of date than the ledger's latest.
The pre-integration fixture endpoints (`/api/legacy/*`) were deleted in Phase 17; every screen reads the real API.

**Authentication (Phase 21).** Off by default (`AUTH_MODE=none`): every caller is anonymous and holds every scope, and
the API behaves as described above. With `AUTH_MODE=jwt` (or an XSUAA instance bound, which turns it on) every endpoint
except `/api/health` and `/api/ready` needs `Authorization: Bearer <JWT>`. Scopes: `view` (all reads, and `POST /forecast`),
`operate` (create / run / reset a simulation, run a scenario, send a signal), `approve` (approve / reject). With
authentication on, an approval is recorded under the **token's** identity, not the `decided_by` in the body — except for a
technical client (a workflow calling back), which may name the human and is recorded as `<name> (via <client>)`. See
[sap-readiness.md](sap-readiness.md).

**Integration (Phase 21).** `POST /api/integration/signals` takes `{source_system, external_id, product_id, report,
candidate?, tariff_overrides?}`; the simulation id is derived from `(source_system, external_id)`, which is what makes a
redelivery recognisable. The events the application publishes (CloudEvents, `com.resilientsc.*`) are specified in
[sap-readiness.md §5](sap-readiness.md#5-sap-integration-suite).

## Relationship to the earlier frontend concept

The page-to-endpoint mapping above (Dashboard → `/api/dashboard`, Disruption
Simulator → `/api/simulations*`, AI Decision Center → `/api/decisions/{id}`,
Inventory Intelligence → `/api/inventory*`, Sourcing → `/api/suppliers`,
Logistics Network → `/api/routes` + `/api/shipments`, Compliance & Approval →
`/api/compliance/{id}` + approve/reject, Agent Monitor →
`/api/agents/status`) was designed to match that nine-page layout one-to-one, so
Phase 16 was a wiring exercise, not a redesign, and is done: all of those pages read
these endpoints, and so is the ninth, Scenarios, since Phase 17 (`/api/scenarios*`).
