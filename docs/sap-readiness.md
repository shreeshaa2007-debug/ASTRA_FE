# SAP readiness — HANA Cloud, BTP, Integration Suite (Phase 21)

The build is now **ready to be restructured onto SAP**: every place that was welded to a local choice (a SQLite file,
CSV files, no sign-in, no way to talk to another system) is a seam with a default and a SAP-shaped alternative behind
it. Nothing changes until an environment variable says so — with all of them unset the application behaves exactly as
before (the full pre-existing suite passes unchanged).

**What "ready" means here, honestly:** everything below was built and tested against SQLite, local HTTP servers and a
real HANA *driver and SQL dialect* — but **nothing has touched a live SAP tenant**, because there was no BTP subaccount.
[§6](#6-what-is-verified-and-what-is-not) lists exactly what is proven and what is not. Treat the first hour on a real
tenant as verification, and use `scripts/check_sap_connection.py` for it ([§8](#8-first-hour-on-a-real-tenant)).

## 1. What became swappable

| Concern | The seam | Default (unchanged) | SAP alternative | Configured by |
|---|---|---|---|---|
| World state (simulations, audit trail) | `WorldStateRepository` → `backend/database/` | SQLite file | **SAP HANA Cloud** (`hana+hdbcli://`), or a bound `hana` service instance | `DATABASE_URL`, `DATABASE_SCHEMA`, `DATABASE_AUTO_CREATE`; `VCAP_SERVICES` |
| Reference data (suppliers, routes, tariffs, inventory, demand, disruptions) | `DatasetRepository` → `backend/data/` | `data/processed/*.csv` | `ref_*` **tables or views in HANA** (over S/4HANA, IBP, …) | `DATA_BACKEND=sql`, `DATA_DATABASE_URL`, `DATA_SCHEMA` |
| Who is calling | `Authenticator` → `backend/api/security.py` | none: everyone is anonymous with every scope | **XSUAA** (or IAS) JWTs: scopes `View` / `Operate` / `Approve` | `AUTH_MODE`, `AUTH_*`; a bound `xsuaa` instance turns it on |
| What the app tells others | `EventPublisher` → `backend/integration/` | nothing leaves the process | **CloudEvents** POSTed to **Integration Suite** (Cloud Integration iFlow / Advanced Event Mesh) | `EVENTS_BACKEND=webhook`, `EVENTS_*` |
| What others tell the app | `POST /api/integration/signals` | — | an iFlow / S/4HANA extension reporting a disruption, idempotently | scope `Operate` |
| Human approval | `POST /api/decisions/{id}/approve` | typed name in the UI | **SAP Build Process Automation** task, then a technical-client callback | scope `Approve` |
| Language model | `LLMClient` + registry → `agents/sensing/llm.py` | Gemini | **SAP AI Core** generative-AI hub (*seam only, client not written*) | `LLM_PROVIDER` |
| Deployment | `mta.yaml`, `xs-security.json`, `approuter/`, `frontend` `build:btp` | run locally | Cloud Foundry on **BTP** behind the **Application Router** | — |
| Optimizer / forecast model | unchanged (`OptimizationEngine`; local XGBoost artifact) | scipy HiGHS / local file | IBP / AI Core or HANA PAL — documented in [architecture.md §2](architecture.md), **not built** | — |

Everything SAP-specific lives in `backend/sap/` (`btp.py` reads `VCAP_SERVICES`, `hana.py`, `xsuaa.py`, `oauth.py`); the
seams themselves are vendor-neutral, so the same code runs against any SQL database, any JWT issuer, any webhook.

## 2. Configuration reference

Nothing is required. A value that is set but wrong stops the app **at startup** with a message naming the setting — it
never falls back to something more open.

| Variable | Meaning | Default |
|---|---|---|
| `DATABASE_URL` | any SQLAlchemy URL. Wins over a binding. | bound `hana` instance, else `sqlite:///./resilientsc.db` |
| `DATABASE_SCHEMA` | schema to qualify every table with | the binding's `schema` |
| `DATABASE_AUTO_CREATE` | create the two world-state tables if missing; `false` where the user may not run DDL | `true` |
| `DATA_BACKEND` | `csv` or `sql` | `csv` |
| `DATA_DIR` | csv: directory of the processed files | `data/processed` |
| `DATA_DATABASE_URL` / `DATA_SCHEMA` | sql: where the `ref_*` tables are | the world-state database |
| `AUTH_MODE` | `none` or `jwt` | `jwt` if an `xsuaa` instance is bound, else `none` |
| `AUTH_JWKS_URL` `AUTH_ISSUER` `AUTH_AUDIENCE` (comma-separated) `AUTH_SCOPE_PREFIX` | token verification, when not taken from the XSUAA binding (needed for IAS) | from the binding |
| `EVENTS_BACKEND` | `none`, `log` or `webhook` | `none` |
| `EVENTS_WEBHOOK_URL` | `https://…`; `{topic}` (type with `/`) and `{type}` are filled in per event | — |
| `EVENTS_AUTH` | `none`, `basic`, `bearer`, `oauth2` | `oauth2` if `EVENTS_OAUTH_TOKEN_URL` is set |
| `EVENTS_BASIC_USER` `EVENTS_BASIC_PASSWORD` · `EVENTS_BEARER_TOKEN` · `EVENTS_OAUTH_TOKEN_URL` `EVENTS_OAUTH_CLIENT_ID` `EVENTS_OAUTH_CLIENT_SECRET` `EVENTS_OAUTH_SCOPE` | credentials for the chosen mode | — |
| `EVENTS_CHECKPOINTS` | `all`, or a comma list of checkpoints | the six business milestones |
| `EVENTS_SOURCE` | CloudEvents `source` | `urn:resilientsc` |
| `EVENTS_TIMEOUT_SECONDS` `EVENTS_MAX_RETRIES` `EVENTS_QUEUE_SIZE` | delivery tuning | 10 / 3 / 1000 |
| `LLM_PROVIDER` | registered provider name | `gemini` |

Secrets (`EVENTS_*` credentials, `LLM_API_KEY`) are read from the environment only; nothing logs them (the log redaction
filter and the tests that check the server's own log see to that). In `mta.yaml` they are deliberately absent: set them with
`cf set-env` or a user-provided service.

## 3. SAP HANA Cloud

**Connecting.** Bind a `hana` instance and do nothing else, or set `DATABASE_URL`. From a binding the app builds
`hana+hdbcli://<runtime user>:<password>@<host>:<port>?encrypt=true&sslValidateCertificate=true` with `URL.create` (a
generated HANA password contains characters that break a string URL — tested) and qualifies every table with the
binding's `schema`. Install the driver with `pip install -r requirements-sap.txt` (`hdbcli`, `sqlalchemy-hana`); a plain
install of `requirements.txt` includes it because Cloud Foundry's Python buildpack reads only that file.

**World-state tables** (`world_states`, `world_state_checkpoints`). Two ways, pick by the service plan:

* plan **`schema`** (what `mta.yaml` uses): the app creates its own tables (`DATABASE_AUTO_CREATE=true`, the default);
* plan **`hdi-shared`**: the runtime user may not run DDL. Set `DATABASE_AUTO_CREATE=false` and create the tables from
  [`db/hana/schema.sql`](../db/hana/schema.sql) — generated from the same table definitions
  (`python -m backend.database.ddl --dialect hana`), and a test fails if the checked-in file drifts. To ship them as
  HDI design-time artifacts (`.hdbtable`) the SQL needs converting; that is not done.

**Reference data.** The agents ask for a dataset by name and get a DataFrame with the columns below — from CSV files today,
from these tables on SAP. To populate HANA from the files: `python scripts/load_reference_data.py` (idempotent: each table
is replaced in one transaction). To connect a real source instead, make `ref_*` **views** that return these columns over
S/4HANA / IBP / your own tables; the application never needs to know. Create them with **unquoted** identifiers
(uppercase in HANA) — that is how SQLAlchemy addresses them.

**`ref_suppliers`** — one row per (supplier, product); `status` ACTIVE / REDUCED / DISRUPTED. `supplier_id` NVARCHAR(32), `supplier_name` NVARCHAR(128), `region` NVARCHAR(64) *(a country name)*, `product_id` NVARCHAR(32), `capacity` INTEGER, `unit_cost` DOUBLE, `lead_time_days` INTEGER, `reliability` DOUBLE, `risk_level` NVARCHAR(16), `status` NVARCHAR(16), `provenance` NVARCHAR(32)

**`ref_routes`** — one row per lane; `status` NORMAL / DELAYED / DISRUPTED / ALTERNATIVE. `route_id` NVARCHAR(64), `origin` NVARCHAR(64), `destination` NVARCHAR(64), `transport_mode` NVARCHAR(16), `distance_km` DOUBLE, `capacity` INTEGER, `transit_time_days` DOUBLE, `cost_per_unit` DOUBLE, `status` NVARCHAR(16), `provenance` NVARCHAR(32)

**`ref_tariffs`** — applied tariff by origin country (ISO3) and year. `origin_country` NVARCHAR(8), `destination_country` NVARCHAR(8), `product_category` NVARCHAR(32), `effective_year` INTEGER, `tariff_rate` DOUBLE, `is_country_level_proxy` BOOLEAN

**`ref_inventory`** — daily stock per warehouse and product. `warehouse_id` NVARCHAR(64), `product_id` NVARCHAR(32), `date` DATE, `opening_stock` INTEGER, `inbound_quantity` INTEGER, `outbound_quantity` INTEGER, `closing_stock` INTEGER, `safety_stock` INTEGER, `stockout_flag` BOOLEAN, `provenance` NVARCHAR(32)

**`ref_demand_panel`** — daily demand per product (only the columns the application reads). `date` DATE, `product_id` NVARCHAR(32), `location_id` NVARCHAR(64), `demand_quantity` INTEGER, `rolling_mean_28` DOUBLE, `split` NVARCHAR(16)

**`ref_disruptions`** — the historical log on the dashboard. `event_id` NVARCHAR(64), `event_type` NVARCHAR(64), `location` NVARCHAR(255), `start_date` TIMESTAMP, `end_date` TIMESTAMP, `severity` NVARCHAR(16), `affected_route` NVARCHAR(64), `affected_supplier` NVARCHAR(64), `estimated_delay_days` DOUBLE, `status` NVARCHAR(16)

`product_id` is text everywhere (the CSVs hold it as a number; the readers always cast it). The contract lives in
[`backend/data/datasets.py`](../backend/data/datasets.py) and a test proves that a database holding these tables leads to
**the same optimizer plan** as the files.

**Not covered:** the supplier-to-origin-port map and the other modeling assumptions
([architecture.md §4.1](architecture.md)) are still configuration (`backend/config/optimization_config.yaml`), not master
data — a real supplier master would need to supply them. HANA-native forecasting (PAL/APL) is not wired.

## 4. SAP BTP

**Deploy** (unverified — see §6):

```
python scripts/load_reference_data.py            # once, against the HANA schema
npm run build:btp --prefix frontend              # UI -> approuter/resources (same-origin, CSRF token on)
mbt build && cf deploy mta_archives/resilientsc_1.0.0.mtar
cf set-env resilientsc-api LLM_API_KEY …         # secrets by hand, then: cf restage resilientsc-api
```

`mta.yaml` declares the API (Python buildpack, **one instance** — run records and the in-flight guard are per process),
the Application Router serving the UI, a `hana` instance and an `xsuaa` instance. Then in the BTP cockpit assign the role
collections **ResilientSC Viewer / Operator / Approver** (from `xs-security.json`) to people.

**Scopes.** `View` reads; `Operate` creates, runs and resets simulations and sends signals; `Approve` approves or rejects
an escalated plan. They are separate on purpose: starting a run is not the right to release a plan, and a test asserts
that the Operator role does not carry `Approve`. Every endpoint needs `View` at least; `/api/health` and `/api/ready`
stay open so the platform can health-check (FastAPI's `/docs` and `/openapi.json` are open too: they describe the API and
return no data). `GET /api/me` says who the API thinks you are.

**Who an approval is recorded against.** With authentication on, the *token's* identity, whatever the request body says
(the answer to "the approver is just a typed string"). The one exception is a **technical client** — a workflow calling
back after a person decided in a task inbox: it may name the human, recorded as `Dana Director (via sb-workflow)`. Grant
`Approve` to a technical client only if you trust it to report honestly.

**Application Router.** `approuter/xs-app.json` routes `/api/*` to the API with `forwardAuthToken` and serves the UI;
both require an XSUAA session. Its CSRF protection is on, and the frontend cooperates only in the BTP build
(`VITE_CSRF_TOKEN=true`: fetch a token, send it on POSTs, refetch on `X-CSRF-Token: Required`).

**Not covered:** Kyma (service bindings arrive as mounted files, not `VCAP_SERVICES` — a second reader with the same
`ServiceBinding` result would slot into `backend/sap/btp.py`), the Destination and Cloud Logging services, IAS-based
tokens beyond the configurable issuer and keys URL, autoscaling (one instance; see §7).

## 5. SAP Integration Suite

### 5.1 Outbound: events

Every world-state checkpoint can become a CloudEvents 1.0 message (structured JSON, `application/cloudevents+json`). By
default the six that a business process acts on are published; `EVENTS_CHECKPOINTS=all` adds the internal steps.

| `type` | when | an integration flow would… |
|---|---|---|
| `com.resilientsc.disruption.sensed` | a validated disruption is on record | notify, open a case |
| `com.resilientsc.plan.optimized` | a plan exists (`OPTIMAL` or `INFEASIBLE`) | — |
| `com.resilientsc.plan.approval.requested` | compliance escalated the plan to a human | start an **SBPA** approval task |
| `com.resilientsc.plan.finalized` | the plan is final (auto-approved, or a named human approved) | create purchase requisitions / transfer orders per allocation |
| `com.resilientsc.plan.rejected` | a human rejected it | close the task |
| `com.resilientsc.run.failed` | the pipeline failed | alert |

* `id` = `<simulation_id>:<version>`: unique per change and **identical on a retry** — de-duplicate on it. `subject` is the
  simulation id; a receiver wanting more calls `GET /api/simulations/{subject}`.
* `data` carries ids, statuses, the disruptions, the plan's allocations and transfers, the compliance verdict and the
  approval (who and when). **Not** free text a person typed (the approval note) and not the raw report.
  `data.plan.cost_unit` says costs are relative — do not read them as a currency.
* **Delivery is at-least-once, in order, off the request path.** A queue and one worker send them; a slow or dead endpoint
  cannot delay or fail a commit. Failures retry with back-off (5xx/429/timeouts; a 4xx is final). A redirect is a failure —
  a POST bounced to a sign-in page must not look delivered. Plain `http` is refused except to localhost.
* `/api/ready` shows an optional `events` check (published / failed / dropped / queued); metrics count them.
* **Not durable:** the queue is in memory, so events die with the process. The durable record is the checkpoint audit
  trail; a transactional outbox (or a replay endpoint over the trail) is the next step if loss matters.

Endpoint examples — Cloud Integration iFlow (HTTPS sender): `EVENTS_WEBHOOK_URL=https://<runtime>/http/resilientsc` with
`EVENTS_AUTH=oauth2` and the service key's `tokenurl`/`clientid`/`clientsecret`; Advanced Event Mesh REST delivery point:
`https://<broker>:9443/topic/{topic}` (→ `…/topic/com/resilientsc/plan/finalized`) with basic or bearer auth.

### 5.2 Inbound: disruption signals

`POST /api/integration/signals` (scope `Operate`):

```json
{ "source_system": "s4hana-prod", "external_id": "PM-NOTIF-4711", "product_id": "22197",
  "report": "Fire at the Istanbul plant", "candidate": null, "tariff_overrides": null }
```

* `report` is the human-readable text; without `candidate` the Sensing Agent (an LLM that only proposes) reads it. With a
  `candidate` — an event the source already structured — the LLM is skipped, but **validation is not**: ids are checked
  against the real routes, suppliers and products.
* **Idempotent per (`source_system`, `external_id`).** The simulation id is derived from them, so the first delivery
  answers **202** and starts a run; a redelivery answers **200** with `duplicate: true` and the current status, and starts
  nothing (racing deliveries resolve in the database: one wins). Consequence: a signal is processed **at most once** — a
  candidate that validation rejected leaves the simulation `CREATED`, and correcting it means a new `external_id`.
* Follow the run at `status_url`, or listen for the events above.

### 5.3 The approval pattern (SAP Build Process Automation)

`plan.approval.requested` → an iFlow starts an SBPA process for the named approver → when they decide, the process calls
`POST /api/decisions/{subject}/approve` (or `/reject`) with a **technical client's** token (scope `Approve`),
`decided_by` = the human, and `expected_version` = the event's `data.version` (so a plan that changed since it was shown
cannot be approved). The API records `Dana Director (via <client>)`, and `plan.finalized` follows. The client
must be allowed to hold `Approve` (its own xs-security `authorities`, granted by this app's `grant-as-authority-to-apps`);
that wiring is tenant-specific and not in `xs-security.json`. **The SBPA process itself is not built.**

## 6. What is verified, and what is not

| Verified (locally, by tests that were themselves broken on purpose — 43 mutants, all caught) | Not verified — needs a tenant |
|---|---|
| The HANA dialect renders the schema with types HANA has (this caught `DATETIME`, which HANA lacks) | That the DDL, the queries and the pool actually run on **HANA Cloud** (the real `hdbcli` driver was exercised only as far as a refused connection) |
| A `VCAP_SERVICES` binding becomes the right URL, schema and token settings; secrets never appear in an error | The exact shape of a real `hana` / `xsuaa` binding, and the `schema` plan on your HANA Cloud |
| The same plans from `ref_*` tables as from CSV files (4 scenarios, identical) | Views over real S/4HANA data |
| JWTs signed with a real RSA key: signature, issuer, audience, expiry, algorithm confusion, `alg: none`, foreign-app scopes, scope-per-endpoint, approver identity | Tokens from a real **XSUAA / IAS** (issuer, `aud` and scope-claim shapes are from documentation) |
| Real HTTP: CloudEvents on a socket, retries, redirect refused, OAuth token caching, an unreachable receiver | A real **Integration Suite** / AEM endpoint and its auth |
| A real uvicorn process configured only by environment: JWKS fetched over HTTP, SQL data backend, events delivered, plan equal to the file-based one, no token in the log | `mta.yaml` deployment (checked for syntax and consistency with the code, never `cf deploy`-ed); the Approuter and CSRF exchange |
| The frontend's BTP build has no `localhost` and typechecks | The UI in a browser behind the Approuter |

Run the new tests: `pytest backend/tests/test_datasets.py backend/tests/test_sap_platform.py backend/tests/test_sap_security.py backend/tests/test_sap_integration.py`
and, for the real-process one, `pytest backend/tests/e2e/test_sap_e2e.py`. Three tests need the HANA dialect and skip
without it (`pip install -r requirements-sap.txt`).

## 7. Found while making it ready

* `sqlalchemy-hana` renders SQLAlchemy's generic `DateTime` as `DATETIME`, which **HANA does not have** — the disruption
  timestamps would have failed at `CREATE TABLE`. Now `TIMESTAMP`; a test forbids `DATETIME` in the HANA DDL.
* The audit trail's `actor` column was `NVARCHAR(64)`, filled with the approver's name. SQLite ignores a declared length;
  HANA enforces it (by its documented behaviour — not observed here), so a 65-character name (the API allows 100) would
  have **failed the approval's commit after the human had decided**, and an e-mail address from a token is longer still.
  It is now 256 and the recorded identity is capped to fit.
* CSV and SQL returned "no value" differently (`NaN` vs `None`) and an all-empty text column as different dtypes;
  both are now normalized, which also removed a pandas mixed-type warning on the disruptions file.
* No existing end-to-end test exercised environment-driven wiring: the harness built its own context. `E2E_WIRING=default`
  now starts the production wiring (only the LLM scripted), which is what the SAP end-to-end test runs.

## 8. First hour on a real tenant

1. `pip install -r requirements-sap.txt`; bind or set `DATABASE_URL`.
2. `python scripts/check_sap_connection.py` — connects, round-trips a simulation (and deletes it), checks the reference
   tables, the auth and events configuration. Add `--token <jwt>` to verify a real token, `--send-test-event` to POST one event.
3. `python scripts/load_reference_data.py`, then set `DATA_BACKEND=sql` and re-run step 2.
4. Start the app; `GET /api/ready` should be ready with `datasets: sql:…` and, if configured, an `events` check.
5. If anything in §6's right-hand column turns out different, the fix is in `backend/sap/` — the seams above do not change.

## 9. Known limits and next steps

* **One API instance.** Run records, the in-flight guard and the events queue are per process, and the run's worker thread
  dies with it. A restart leaves a `RUNNING` simulation `stalled` (recoverable by reset). Scaling out needs the run registry
  and a durable outbox in the database — the natural HANA follow-up.
* **Events are not durable** (§5.1). **A signal is processed at most once** (§5.2).
* **No AI Core client** for the language model or the forecast; the seam and the registration point exist
  (`register_llm_provider`), the class does not. The model artifact still ships inside the app.
* **The SBPA process, the iFlows, the S/4HANA views and the IBP engine are not built** — they are what the seams are for.
* One product per run, and only 2 of 40 products have a feasible baseline: unchanged from [implementation-plan.md](implementation-plan.md).
* The Python dependencies are `>=` ranges (as before); pin them for a deployment. Locally, NumPy 2.4 already warns against
  the installed SciPy.
