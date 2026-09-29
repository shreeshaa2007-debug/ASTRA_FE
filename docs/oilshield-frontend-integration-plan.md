# OilShield frontend → backend integration plan

## 0. What this is

The `optimized` branch on `astra` (`https://github.com/shreeshaa2007-debug/ASTRA_FE.git`,
checked out locally at `../ResilientSC-optimized`, local branch `optimized`) replaces this
repo's frontend with a new one, "OilShield — Agentic AI Oil Supply Chain Control Tower."
It was generated in Google AI Studio (per its `README.md`) as a **disconnected UI
prototype**: every screen currently reads from an in-memory mock store, not this backend.

**Decision (confirmed with the user):** go with the **relabel-layer** strategy — keep the
backend's real generic data model (products/warehouses/suppliers/routes, MVP cost units)
exactly as it is, tested and working (786 passing tests), and wire the new UI to it through
an adapter that presents the same real numbers in oil vocabulary (units → "barrels",
supplier → "crude supplier," etc.). Fields the mock invented that have **no real source**
(vessel names, API gravity, sulfur %, crude grade, port access, carbon intensity) are not
fabricated — see §4 for the per-field disposition. This is explicitly *not* the "real oil
domain rebuild" option (new datasets, new agents) — that stays available as a later,
separately-scoped phase if the team decides the vocabulary needs to become real data.

## 1. What changed — frontend audit

**Structural.** `frontend/src/*` moved to a root-level `src/*`; `package.json`,
`vite.config.ts`, `tsconfig.json`, `index.html` moved from `frontend/` to the repo root. The
new repo has no `backend/`, `docs/`, `data/`, `ml/` at all — it is frontend-only. Two new
dependencies: `recharts` (charts) and `react-is` (a `recharts` peer). No new
data-fetching/telemetry libraries were added despite an earlier commit message
("real-time port telemetry, ML delay prediction, SAP BTP bridge") — nothing in the final
`optimized` commit (`ae08a42`) implements any of that; it is mock state only.

**Domain pivot.** The old frontend was product/warehouse/route/supplier-generic, matching
`backend/schemas/entities.py` exactly. The new one is built entirely around crude oil
logistics: vessels, barrels, refineries, crude grade, API gravity, sulfur content, ports,
and oil-specific compliance categories (Maritime Safety, Sanctions & ESG, Crude
Specification) — see `src/types/oilshield.ts` (also duplicated, oddly, as
`src/types/oilshield.py`, an unused stray file). None of this vocabulary exists in the
current backend or its datasets.

**Navigation.** Nine screens became eight (`src/components/layout/OilShieldSidebar.tsx`):
Overview & Shipments, Supply Network, Supplier Intelligence, Logistics & Transport, Recovery
Options, Approvals & Decisions, Audit Trail, Settings. Inventory and Compliance are not
separate nav entries any more — `App.tsx`'s router folds `inventory`/`disruptions`/`agents`
into `OverviewView` ("Inventory page removed per Section 10; backend logic preserved") and
`compliance` into `DecisionCenterView` ("Compliance integrated into Decisions per Section
12"). `InventoryManagementView.tsx`, `DisruptionCenterView.tsx`, `AgentIntelligenceView.tsx`
and `ComplianceCenterView.tsx` exist as built components but are **unreachable** — dead code
same as the old views below, unless a future nav change re-adds them.

**Data layer.** Completely swapped. Old: `SimulationContext.tsx` + `services/api.ts` (typed
REST client, matches `docs/api-plan.md` exactly) + `hooks/useFetch.ts` (no-fallback-value
loading/error/data pattern) + `hooks/useProducts.ts`. New: `context/OilShieldContext.tsx`,
one big `useState` per entity, seeded from `data/mockOilShieldData.ts` (1,624 lines) and
mutated only in the browser (`approveScenario`, `rejectScenario`, etc. all just call
`setState`). **Zero `fetch` calls anywhere in the new code path.**

**What's still there but orphaned.** `services/api.ts`, `types/api.ts`,
`context/SimulationContext.tsx`, `hooks/useFetch.ts`, `hooks/useProducts.ts`, and all nine
old view components (`DashboardView.tsx`, `InventoryView.tsx`, `LogisticsView.tsx`,
`SourcingView.tsx`, `ComplianceView.tsx`, `DecisionView.tsx`, `AgentMonitorView.tsx`,
`ScenariosView.tsx`, `SimulatorView.tsx`) are byte-identical or near-identical to the
current `frontend/src` and still call the real API — but `App.tsx` never imports them, so
they don't even end up in the Vite bundle. This is useful: the real API client doesn't need
to be rebuilt, only reconnected (§3).

## 2. Entity mapping / gap table

What the new UI's types (`src/types/oilshield.ts`) ask for, against what the backend
(`docs/api-plan.md`, `backend/api/views.py`) actually returns today.

| OilShield type | Nearest real backend source | Gap under the relabel-layer strategy |
|---|---|---|
| `DisruptionIncident` | `state.current_disruptions` (`GET /api/disruptions`, `/api/dashboard`) | Real: `event_type`, `location`, `severity`, `confidence`, timestamps. No source: `vesselName`, `affectedShipment`, `affectedRefinery`, `affectedCustomer`, `quantityBarrels` (no shipment dataset exists — the backend is explicit that `/api/shipments` lists what the *plan proposes*, never observed shipments) |
| `SpecializedAgent` | `agent_statuses()` (`GET /api/agents/status`, `/api/simulations/{id}/status`) — `id/name/status/detail/latency_ms` per stage | Real: status, detail text, latency. No source: `confidenceScore`, `evidenceCount`, `structuredOutput`, `iconName` as numeric/structured fields — these were invented for the mock's narrative agent cards |
| `CrudeSupplier` | `supplier_rows()` (`GET /api/suppliers`) — `supplier_id, region, capacity, unit_cost, reliability, status, tariff_rate_pct, recommended_quantity` | Real: capacity→`availableQuantityBarrels` (relabeled unit), cost→`estimatedCostPerBbl`, reliability→`reliabilityScorePct`, status→`approvalStatus` (mapped enum). No source: `crudeGrade`, `apiGravity`, `sulfurContentPct`, `portAccess`, `contractType` — genuinely oil-specific fields with nothing in `suppliers.csv` |
| `LogisticsOption` | `route_rows()` (`GET /api/routes`) — `route_id, mode, cost_per_unit, capacity, status, transit_days, planned_quantity` | Real: cost/capacity/status/transit relabel cleanly. No source: `PIPELINE`/`ROAD` transport modes (backend only has sea/rail/air), `carbonIntensityKgPerBbl`, `infrastructureNotes`, `connectivityVerified` |
| `InventoryFacility` | `inventory_rows()` (`GET /api/inventory`) — `warehouse_id, current_stock, safety_stock, forecast_demand, stockout_risk, days_of_cover, recommended_transfer` | Real: stock/safety-stock/risk/transfer relabel cleanly (units→barrels). No source: facility `type` enum (Refinery Terminal/Strategic Reserve/…), `pipelineConnected`, `railSidingAvailable` — warehouses in this dataset are Mumbai/Chennai/Delhi, not refineries |
| `RecoveryScenario` / `DynamicRecoveryOption` | `decision_view()` (`GET /api/decisions/{id}`) — `allocations, objective_terms, decision_factors, deviations, assumptions, excluded_options, constraints` + `backend/simulation/comparison.py`'s three-way comparison | Real: cost, feasibility (`plan_status`), the allocation mix, deviations map reasonably onto `whyThisScenario`/`assumptions`/`risks` with real text. No source: `feasibilityScore` as a 0–100 number (backend has OPTIMAL/INFEASIBLE, not a score), narrative `supportingEvidence`/`unresolvedUncertainties` lists |
| `ComplianceCheckRule` | `state.compliance_status` (`GET /api/compliance/{id}`) — checks against `backend/config/compliance_rules.yaml` (supplier policy, country policy, transaction threshold, route policy) | Real: PASS/WARNING/FAIL-shaped verdicts relabel onto `status`/`severity`. No source: the categories themselves — "Maritime Safety," "Sanctions & ESG," "Crude Specification" don't exist; the real categories are Supplier/Country/Threshold/Route |
| `SupplyChainNode` (network graph) | No direct endpoint — would combine `GET /api/routes` + `GET /api/suppliers` + warehouse list | Real: can be assembled client-side from the three existing endpoints. No source: `throughputBarrelsPerDay`, `currentCapacityPct` as a single number (route/supplier capacity exist but not a unified node metric) |
| `AuditEvent` | `state_view()`'s `timeline` (checkpoint history, already in every status response) | Real: event name, actor (`decided_by` on approval checkpoints), timestamp all map. No source: `verificationHash` (invented for demo flavor — a real hash would need to be computed, e.g. over the checkpoint payload, which is buildable but doesn't exist today) |
| `SystemNotification` | none | Purely a frontend-derived concept (e.g., "compliance just verdicted this simulation") — no backend change needed, just an adapter that watches status transitions and synthesizes notifications client-side |
| `OperationalShipment` | `shipment_rows()` (`GET /api/shipments`) — already explicitly "the shipments the plan *proposes*, never observed" | Real: maps cleanly, same caveat the backend already documents. No source: `vesselName`, per-shipment `isEmergency` flag |

**Read on this table:** every screen's *numbers that drive a decision* (cost, capacity,
feasibility, compliance verdict, approval state) have a real backend source. What's missing
is exclusively flavor/narrative fields the mock invented to make the UI feel like a real oil
desk. That is exactly what makes the relabel-layer strategy viable without new data
acquisition.

## 3. Screen-by-screen wiring plan

| Screen (sidebar id) | View component | Backend calls needed | Notes |
|---|---|---|---|
| Overview & Shipments | `OverviewView.tsx` | `GET /api/dashboard`, `GET /api/disruptions`, `GET /api/shipments`, `GET /api/agents/status`, `GET /api/decisions/{id}` (for the recovery-option preview) | Folds in what used to be Dashboard + Disruptions + Agent Monitor summary + Inventory summary |
| Supply Network | `SupplyNetworkView.tsx` | `GET /api/routes`, `GET /api/suppliers`, `GET /api/inventory` (client-assembled graph, §2) | New: no existing screen built this graph; needs a small adapter, not a new endpoint |
| Supplier Intelligence | `SupplierIntelligenceView.tsx` | `GET /api/suppliers` | Was `SourcingView.tsx` |
| Logistics & Transport | `LogisticsTransportationView.tsx` | `GET /api/routes`, `GET /api/shipments` | Was `LogisticsView.tsx`; drop PIPELINE/ROAD filter options or gray them out (no data) |
| Recovery Options | `RecoveryScenariosView.tsx` | `GET /api/scenarios`, `GET /api/scenarios/{id}/comparison`, `POST /api/scenarios/{id}/run`, `GET /api/simulations/{id}/comparison` | Was `ScenariosView.tsx` + parts of `SimulatorView.tsx`/`DecisionView.tsx` |
| Approvals & Decisions | `DecisionCenterView.tsx` | `GET /api/decisions/{id}`, `GET /api/compliance/{id}`, `POST /api/decisions/{id}/approve`, `POST /api/decisions/{id}/reject` | Was `DecisionView.tsx` + `ComplianceView.tsx` merged |
| Audit Trail | `AuditTrailView.tsx` | the `timeline` array already returned by `GET /api/simulations/{id}/status` | No new endpoint; just render what's already there |
| Settings | `SettingsView.tsx` | `GET /api/health`, `GET /api/ready`, `GET /api/me` (Phase 21 auth) | `emergencySpendLimit`/`minCoverageDays`/`agentConfidenceThreshold` are currently pure client state with no backend counterpart — decide in §5 whether they become real config (e.g. `approval_threshold` in `compliance_rules.yaml`) or stay client-only demo knobs |

## 4. Fields with no backing data — disposition (never fabricate)

Per this project's own stated design rule ("nothing on screen is fixture data"), every field
in §2's "no source" column needs an explicit choice, not a silent placeholder:

| Field(s) | Disposition |
|---|---|
| `vesselName`, `affectedShipment`, `affectedRefinery`, `affectedCustomer` | **Drop from the UI**, or clearly render `"Not tracked — no shipment dataset"` the way `backend/api/views.py` already does for `/api/shipments`. Do not invent vessel names. |
| `crudeGrade`, `apiGravity`, `sulfurContentPct`, `portAccess`, `contractType` | **Drop from the supplier card**, or move behind a "demo-only, not sourced" badge if the team wants to keep the visual richness for the hackathon pitch specifically — but never mixed in with real fields without a marker |
| `carbonIntensityKgPerBbl`, `infrastructureNotes`, `connectivityVerified` | **Drop** from the logistics table |
| `feasibilityScore` (0–100) | **Recompute, don't fabricate**: derive a real signal from `plan_status` (OPTIMAL/INFEASIBLE) plus `binding_constraints` count, e.g. OPTIMAL-and-unconstrained → high, OPTIMAL-with-N-binding → scaled down, INFEASIBLE → 0. Document the formula where it's implemented. |
| `verificationHash` | Either compute a real hash (e.g. SHA-256 of the checkpoint's JSON) server- or client-side, or drop the field — do not use `Math.random()` in production code (the mock's current implementation) |
| `emergencySpendLimit`, `minCoverageDays`, `agentConfidenceThreshold` | Team decision: wire to `backend/config/compliance_rules.yaml`'s `approval_threshold` (spend limit has a real counterpart already) and leave coverage/confidence as client-side demo knobs with a label saying so, or extend the config file — flag as an open question, not a default |
| `SystemNotification` | Fine to keep entirely client-derived (§2) — synthesize from status-transition watching, not from a fake dataset |

## 5. Phased implementation plan

Mirrors this project's own phase-gate convention (`docs/implementation-plan.md`).

**Phase O1 — Structural merge.** Bring `optimized`'s `src/*` into `frontend/src/*` in this
repo (not the reverse — this repo's `backend/`, `docs/`, `data/`, tests, CI-equivalent
tooling stay authoritative). Keep `frontend/package.json`'s existing deps and add
`recharts`/`react-is`. Delete the now-truly-dead old view files
(`DashboardView.tsx`, old `InventoryView.tsx`, etc.) only after O3 confirms nothing in the
new tree references them — don't delete blind. Decide the fate of `AgentIntelligenceView`,
`DisruptionCenterView`, `InventoryManagementView`, `ComplianceCenterView` (built but
unrouted): wire them into the nav, or delete them too, rather than leaving unreachable code.

**Phase O2 — Adapter layer, not a backend rewrite.** Add one new module,
e.g. `frontend/src/adapters/oilshieldAdapter.ts`, that takes the *existing* typed responses
from `services/api.ts` (`types/api.ts`) and maps them into `types/oilshield.ts` shapes per
the table in §2. This keeps the backend's tested contract (786 tests, `api-plan.md`)
completely stable — the adapter is the only place oil vocabulary exists. Recommendation:
do **not** change backend response field names/shapes for this; a presentation adapter is
lower-risk and reversible if the oil vocabulary is later dropped.

**Phase O3 — Rewire `OilShieldContext`.** Replace each `useState(INITIAL_*)` with a fetch
through the adapter (reuse `hooks/useFetch.ts`'s no-fallback-value discipline: loading /
error / data, never a fake default). Keep `SimulationContext`'s pattern of polling `/status`
only while a run is in flight. `approveScenario`/`rejectScenario`/`approveRecoveryOption`/
etc. call `POST /api/decisions/{id}/approve|reject` instead of local `setState`, and rely
on the response to update state (matching the current frontend's `expected_version`
optimistic-concurrency handling — don't drop that safety check).

**Phase O4 — Per-field dispositions from §4.** Implement each row's decision; get sign-off
on the ones marked "team decision" before building them.

**Phase O5 — Notifications.** Implement `SystemNotification` generation by watching
status-transition events from the real polling loop (compliance verdict arrives, run
finishes, approval recorded) — client-side only, no backend change.

**Phase O6 — Testing.** Port the existing Playwright/DevTools-protocol browser E2E suite
(`backend/tests/e2e/browser/`) to the new screen structure — same principle as before
(real backend process, scripted deterministic LLM, assert no `undefined`/`NaN`, figures
match the API). This is where regressions in the adapter layer get caught.

**Phase O7 — Cleanup.** Remove `mockOilShieldData.ts` (or keep it only behind an explicit
`VITE_DEMO_MODE` flag if offline/no-backend demos are still wanted — the current repo
already has a `--fresh` demo-seeding pattern in `scripts/demo.py` that could replace this
need entirely), remove the stray `src/types/oilshield.py`, and delete the truly-orphaned
old view files once O1's nav decision is final.

## 6. Open questions for the team

1. Which of the "no source" fields in §4 are load-bearing for the hackathon pitch and worth
   real backend investment later (§0's "real oil domain rebuild" option), vs. safe to drop?
2. Do `emergencySpendLimit`/`minCoverageDays`/`agentConfidenceThreshold` become real backend
   config, or stay demo-only client knobs with an explicit label?
3. Do `AgentIntelligenceView`/`DisruptionCenterView`/`InventoryManagementView`/
   `ComplianceCenterView` get wired into the nav (restoring 4 screens) or deleted?
4. Is the oil vocabulary itself (barrels, crude, refineries) meant to stay permanently, or
   was it an artifact of how the new UI happened to be generated — i.e., should the relabel
   adapter instead go the *other* direction (present the new UI's layout/UX but keep the
   existing generic-goods vocabulary)? Worth confirming before Phase O2 is built, since the
   adapter's every mapping depends on the answer.
