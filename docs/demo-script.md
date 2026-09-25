# Demo script — ResilientSC (about 6½ minutes)

Written for: whoever is presenting. The numbers below are from real runs of this repository's data
(`python scripts/demo.py`); the shape is what matters, so round them when you speak. Screenshots of every
step are in [docs/demo/](demo/) — they are the backup slides if anything fails live.

## Before you go on (5 minutes, once)

```bash
python scripts/demo.py --check --live     # every line green; "llm live call: answered in ~2s: NO_DISRUPTION"
python scripts/demo.py --fresh            # starts the backend + UI, runs Suez once, warms the model, opens the browser
```

- The UI is at **http://127.0.0.1:5173**. Zoom the browser to 110–125% for a projector. Full screen (F11).
- Leave the terminal window visible on a second screen: `python scripts/demo.py` prints the URLs, and the
  backend's JSON logs are in `.demo-logs/api.log` if someone asks "what is it doing?".
- No internet needed for anything **except** the language model: the map, fonts and icons are bundled.
  If the network is down, the scenarios still run; only free-text reports need Gemini (see *If something fails*).
- `--fresh` deletes `resilientsc.db`. Do it before you start so old test runs don't show on the dashboard.

## The 30-second pitch

> Supply chains break at the edges — a canal closes, a supplier burns down, a tariff moves. The hard part isn't
> *seeing* it, it's deciding what to do while staying inside policy. ResilientSC reads a disruption report,
> lets five specialised agents assess it, has a real optimizer choose a response, checks that response against
> policy in plain code, and stops for a named human when it's expensive. Nothing is a black box: every step is
> a checkpoint you can read, and everything it shows is either real, derived, or plainly labelled as simulated.

## Walkthrough

| Time | Screen | Do | Say |
|---|---|---|---|
| 0:00 | **Dashboard** | Just show it. Point at the map, the KPI strip, "Value at risk". | "This is the command center *after* one run: the Suez Canal closed, four lanes are disrupted. 'Shipments at risk' is the part of our normal plan that the disruption invalidates: one shipment, 252 units, worth about 47k cost units. Note the label — there's no shipment dataset in the world, so these are the *modelled* plan's shipments, never observed ones." |
| 0:45 | **Scenarios** → *Supplier Failure (Istanbul)* | Click the scenario. Let the three cards load (a second). | "Three cases for one product. **Normal operations** — the plan the optimizer would pick with no disruption. **Do nothing** — that same plan when the fire hits: 3,759 of 4,011 units never arrive and every warehouse ends below safety stock. **Optimized response** — the optimizer re-plans: everything is covered, for about **+362k cost units, +94%**. The price of resilience is on screen." |
| 1:45 | Scenarios → *Port Congestion* | Click it. | "And this one says *not simulated*: our transit model can't represent delays yet, so it refuses to invent a number. We'd rather show a gap than a made-up chart." |
| 2:00 | Scenarios → *Supplier Failure* → **Run through the full pipeline** | Click. Wait ~5 s. It jumps to the Simulator. | "Now the real pipeline, end to end, no shortcuts." |
| 2:15 | **Simulator** | Point along the graph: Sensing → Inventory / Logistics / Sourcing → Optimizer → Compliance → Human. | "Each box is what the world state *recorded* — no agent grades its own homework. Sensing read the event; three agents assessed inventory, routes and suppliers; the optimizer solved one integer program over all of it in about 5 milliseconds; compliance ran four deterministic checks — **no LLM anywhere in that step** — and it stopped here: **awaiting human approval**, because the plan costs 746k, over the 500k threshold." |
| 3:00 | **AI Decisions** | Point at the plan box, the objective, then the constraints. | "Why this plan? With Istanbul gone the optimizer buys **everything from S003 in Pune, all by sea** — it arrives on day 15 instead of day 6.6. Look at the objective: **freight is about as big as the goods themselves** (361k vs 368k) — that is the real price of losing your nearby supplier. All 23 constraints are verified by an independent checker; the safety-stock limits at all three warehouses are binding — there is nothing to spare." |
| 3:30 | *(optional, +30 s)* **Sidebar picker** → the seeded Suez run → AI Decisions | Pick `SUEZ_CLOSURE` in the sidebar's simulation picker, click AI Decisions. | "The earlier Suez run, for contrast. Here the solver was *never offered* the stranded suppliers — with the lanes closed they have no route — and it **overrides the Sourcing Agent's own advice** (it suggested 252 units from S003; the joint plan takes them from S006) and says why. Agents advise; the optimizer decides jointly." Then pick the supplier-failure run again to continue. |
| 4:00 | **Compliance & Approvals** | Point at the four checks; the amber one is the cost check. Type a name, click **Approve**. | "Three hard checks pass; the fourth — cost — doesn't *reject*, it *escalates*. A hard violation is never sent for approval, whatever it costs. This needs a named person. The decision is tied to the plan version they were shown; if the plan changed underneath them, it's refused." |
| 4:30 | **Dashboard** | Click Overview. | "Approved — and the dashboard now follows the finalized plan. The audit trail records who." |
| 4:45 | **Agent Monitor** | Scroll to the audit trail and **Operations**. | "Every state change is a named checkpoint — that's the audit trail, and the same events are in the JSON logs and in these metrics. Down here: the demand model's health. **It's flagging drift**: recent demand is more than five standard deviations above anything it was trained on — it never saw a Q4 ramp. Click *Backtest* and it scores itself: about 77% error over the last two weeks. The system tells you when *not* to trust it." |
| 5:30 | **Simulator** → *Mumbai Cyclone* → **Run** *(needs the network)* | Click, Run. ~5 s. | "Same pipeline, but from free text: Gemini reads the report and *proposes* an event. It can't choose ids, and it can't touch state: plain code validates every id against the real network before anything happens. Anything malformed is dropped whole." |
| 6:00 | Close | | "Real optimizer, real forecasting model, real data where it exists, honest labels where it doesn't. Production target is SAP IBP and S/4HANA — that's an architecture, not a connection, and we say so." |

## If something fails

| What | You'll see | Do |
|---|---|---|
| **No internet / Gemini down** | Free-text run ends `SENSING ERROR`; header says "no LLM key" or the circuit opens | Skip the cyclone step. Everything else is unaffected — scenarios use a structured trigger and never call the model. Say: "the model is the *only* network dependency, and it's optional." |
| **Backend stopped** | Header turns "API Unreachable"; screens show a fix-it message | `python scripts/demo.py` again (state persists in the DB). The UI recovers with **Retry**, no reload. |
| **Something looks stale** | — | `python scripts/demo.py --fresh` restarts from an empty database. |
| **Browser or laptop dies** | — | Open the PNGs in `docs/demo/` in order: they follow this script step for step. |
| **Port in use** | `--check` says which | `--api-port 8001 --web-port 5174` |

## Questions you'll get

- **"Is the LLM making the decisions?"** No. It reads a report and proposes a structured event. Validation is plain
  code, the optimizer is a real integer program, compliance is deterministic rules, and a human approves the
  expensive ones. If the model is down, scenarios still run.
- **"Are these real costs?"** No — they're in the project's own cost unit, with no currency. Supplier cost and
  capacity are synthetic (no public dataset has them). The *mechanics* are real; the *magnitudes* are illustrative.
- **"What data is real?"** UCI Online Retail demand (541,909 transactions), the World Port Index (3,669 ports),
  World Bank tariff rates, NOAA storm events, and four curated real disruptions. Full table:
  [real-vs-simulated.md](real-vs-simulated.md).
- **"Why isn't there a shipment table?"** No public shipment dataset exists. The 'shipments' you see are what the
  plan proposes, labelled `PROPOSED` until approved.
- **"How accurate is the forecast?"** Honestly, modestly: it beats a naive baseline overall (mean WAPE ≈ 105% vs 141%), wins on half the
  series, and on the last 14 days of data its error is high (WAPE ≈ 77%) because demand ramped into Q4. The
  monitor says so.
- **"Is SAP connected?"** No. There's a documented target architecture (IBP for supply planning, AI Core for
  the model, Event Mesh for triggers, BTP Workflow for approvals) in [architecture.md](architecture.md), and the
  optimizer sits behind an interface so an SAP engine is a different adapter. We don't claim a connection.
- **"What happens if two people approve at once?"** One wins, the other gets a conflict; the page then shows the
  winner's decision. (We test exactly that in a real browser.)
- **"Can it scale?"** It's an MVP: one process, SQLite. The world-state store sits behind an interface (HANA
  Cloud is the intended adapter) and the optimizer solves in milliseconds; scaling is a deployment question, not
  a design one.

## Numbers to have in your head (this dataset, product 22197)

| | Suez closure | Supplier failure (S007) |
|---|---|---|
| Baseline plan spend | 384,399 | 384,399 |
| Do nothing | 252 units lost (of 4,011) | 3,759 units lost |
| Optimized response | 424,509 (**+10.4%**) | 746,143 (**+94.1%**) |
| Approval | auto-approved (< 500,000) | **escalated** to a human |

## Never say

- "real-time" (it isn't connected to any live feed), "connected to SAP", "AI decides" or "predicts disruptions"
  (it *reacts* to a reported one), or a currency ("₹", "$"): the unit is cost units.
