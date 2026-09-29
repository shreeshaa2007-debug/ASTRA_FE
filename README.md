# ResilientSC

AI-assisted supply-chain resilience platform — SAP Hackfest project. Senses a
disruption, forecasts its inventory impact, evaluates logistics and sourcing
alternatives, optimizes a response, checks compliance, and asks a human to
approve anything high-impact before it's final.

**Status: all phases complete (Phase 11, SAP-native optimization, is documentation-only —
there is no SAP environment) — data, forecasting, five agents, the optimizer, the shared world
state, the orchestrator, the API, the frontend, scenario simulation, an end-to-end suite,
observability, and demo prep. Try it: `python scripts/demo.py`.**

**Ready for SAP (Phase 21):** the database, the reference data, sign-in, integration events and the
deployment are each behind a seam with a SAP alternative — **SAP HANA Cloud**, **SAP BTP** (XSUAA,
Application Router, Cloud Foundry) and **SAP Integration Suite** — all off until configured, none yet
verified against a live tenant. Start at [docs/sap-readiness.md](docs/sap-readiness.md).

## Run the demo (one command)

```bash
python scripts/demo.py --check --live   # is everything in place? (packages, data, model, node, ports, one real LLM call)
python scripts/demo.py --fresh          # start the backend and the UI, seed one finished run, open the browser
```

The UI is at http://127.0.0.1:5173. It needs no internet except for the language model (free-text reports in the
Simulator); the map, fonts and icons are bundled, and the defined scenarios never call the model. Ctrl+C stops it.
The presenter's script, the "what is real vs. simulated" statement and backup screenshots are in
[docs/demo-script.md](docs/demo-script.md), [docs/real-vs-simulated.md](docs/real-vs-simulated.md) and
[docs/demo/](docs/demo/). Prerequisites are below; `--check` tells you what is missing.

## Start here

- [docs/architecture.md](docs/architecture.md) — system design, the MVP↔SAP
  production mapping, and why each off-limits framework was avoided
- [docs/implementation-plan.md](docs/implementation-plan.md) — phase status,
  tech stack decisions, open questions for later phases
- [docs/data-plan.md](docs/data-plan.md) — dataset strategy + Phase 2 outcome
- [data/dataset_registry.yaml](data/dataset_registry.yaml) — the 4 real
  datasets acquired (152MB, in `data/raw/`, gitignored) plus documented gaps
- [docs/model-plan.md](docs/model-plan.md) — demand-forecasting approach
- [docs/agent-plan.md](docs/agent-plan.md) — each agent's contract and tools
- [docs/api-plan.md](docs/api-plan.md) — REST endpoint plan
- [docs/demo-script.md](docs/demo-script.md) and [docs/real-vs-simulated.md](docs/real-vs-simulated.md) — how to present it, and what to (not) claim
- [docs/sap-readiness.md](docs/sap-readiness.md) — moving onto SAP HANA Cloud / BTP / Integration Suite: what is ready, the
  configuration, the contracts, and what is still unverified

## How the build is phased

Per the project brief this repo is built in phases with a sign-off gate after
each one — [implementation-plan.md](docs/implementation-plan.md) has the phase
status, tech-stack decisions, and the open questions that still matter (SAP BTP
access, solver-library confirmation).

## Layout

```
backend/    API, agents, optimization, models, services, schemas, database,
            simulation (scenarios + comparison), orchestration, monitoring,
            tests (unit, integration, end-to-end), config
frontend/   React/Vite command-center UI; every screen reads backend/api
            sap/ (BTP bindings, HANA, XSUAA, OAuth), data/ (reference-data access),
            integration/ (events out, signals in)
scripts/    demo.py (one-command run), capture_demo.mjs (screenshots of the
            demo path), fetch_fonts.py (self-hosts the UI's fonts),
            load_reference_data.py (CSV -> HANA tables), check_sap_connection.py
approuter/  SAP Application Router (serves the UI on BTP)   db/hana/  generated HANA DDL
mta.yaml, xs-security.json    the BTP deployment and its roles (not yet deployed)
data/       raw/ (gitignored, 4 real datasets — see dataset_registry.yaml)
            interim/ processed/
ml/         training / evaluation / artifacts
docs/       this project's plans
```

## Running locally

The backend is the real pipeline: a free-text disruption report goes in, a
compliance-checked plan (and, if it's high-impact, a human decision) comes out. See
[docs/api-plan.md](docs/api-plan.md) for the endpoints. Every screen of the frontend
reads that API; nothing on it is fixture data.

```bash
# Backend (from the REPO ROOT — data and config paths are relative to it)
python -m venv .venv
.venv/Scripts/activate        # Windows; `source .venv/bin/activate` elsewhere
pip install -r requirements.txt
cp .env.example .env          # then put your Gemini key in LLM_API_KEY
uvicorn backend.api.main:app --port 8000 --env-file .env     # one worker: run state is per-process

# Try it
curl -X POST localhost:8000/api/simulations -H 'content-type: application/json' -d '{"scenario_type":"SUEZ_CLOSURE"}'
curl -X POST localhost:8000/api/simulations/<id>/run -H 'content-type: application/json' \
  -d '{"signal":"A container vessel has run aground in the Suez Canal, blocking traffic.","product_id":"22197","as_of_date":"2011-11-30"}'
curl localhost:8000/api/simulations/<id>/status        # poll until run.state is FINISHED
curl localhost:8000/api/decisions/<id>                 # why this plan

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                   # http://localhost:5173

# Tests
python -m pytest                       # everything: unit, integration, and the end-to-end layer below
python -m pytest -m "not e2e"          # ~75s: no subprocesses, no browser
python -m pytest -m "e2e and not browser"   # real uvicorn processes over real HTTP (~1 min)
python -m pytest -m browser            # the UI in headless Chrome against a real backend (~1.5 min)
python -m pytest backend/tests/e2e/test_sap_e2e.py   # the SAP wiring as a real process (JWT, SQL data, events)
RUN_LIVE_LLM_TESTS=1 python -m pytest  # also the opt-in tests that call the real Gemini (LLM_API_KEY exported)
```

**Operating it.** Logs go to stderr, one line per event, stamped with the request, simulation and
run they are about: `LOG_FORMAT=json LOG_LEVEL=info uvicorn ...` and then `grep sim-abc123 server.log`
follows a simulation from its POST to the human's approval. Every response carries `X-Request-ID`
(send your own to correlate), and an error names it. `GET /api/ready` says whether the process can do
its job (503 + which dependency if not), `GET /api/metrics` (`?format=prometheus`) counts requests, runs,
steps, solves, LLM calls and model inferences, and `GET /api/monitoring/model` reports the demand model's
health. The Agent Monitor page shows all of it. Tunables: `backend/config/monitoring.yaml`.

**End-to-end tests** (`backend/tests/e2e/`) start the production app as a real process
on its own SQLite file — the only substitution is a deterministic scripted LLM — and drive
it over HTTP and through the frontend in headless Chrome (no test dependencies beyond
`httpx`, Node and a Chrome/Edge; set `CHROME_PATH` if it isn't found). They skip
themselves when a prerequisite is missing. Screenshots of each browser journey are
written under pytest's tmp directory (`artifacts/`), which is where to look when one fails.

Interactive API docs are at `http://localhost:8000/docs`. The world state is stored in
the database named by `DATABASE_URL` (SQLite by default).
