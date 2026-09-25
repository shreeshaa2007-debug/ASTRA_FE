# What is real, what is derived, what is simulated

Written for: judges, reviewers and anyone asking "what am I actually looking at?". This is the honest
inventory — the same labels the UI uses. Provenance is also carried in the data itself (every processed record
has a `provenance` of `real`, `derived` or `synthetic`) and in [data/dataset_registry.yaml](../data/dataset_registry.yaml).

**Legend** — **Real**: measured, from a public dataset. **Derived**: computed from real data by a documented rule.
**Synthetic**: generated because no public source exists, and labelled. **Not connected**: a target, not a live link.

## Data

| Thing on screen | Status | Source and what to know |
|---|---|---|
| Product demand history | **Real** | UCI Online Retail: 541,909 transactions, Dec 2010 – Dec 2011, 4,070 products. Returns/cancellations excluded. UK-aggregate daily demand for the 40 densest products is what the model trains on. |
| Demand forecast | **Real model on real data** | XGBoost, one global model over the 40 series, compared against four baselines (naive, seasonal-naive, moving average, exponential smoothing). It beats naive overall (mean WAPE ≈ 105% vs 141%) and wins about half the series — it is *not* claimed to be accurate: intermittent retail demand is hard. Stored with metrics and feature importance. |
| Warehouse stock (Mumbai, Chennai, Delhi) | **Derived + synthetic split** | No public warehouse ledger exists. Stock is derived from the real demand series with a *synthetic* 3-warehouse split (45/30/25% demand share, different cover and safety-stock multipliers). |
| Ports and their coordinates | **Real** | US NGA World Port Index (3,669 ports; a 2017 snapshot). |
| Route lanes (Suez, Cape, rail, air) | **Derived** | Distances are great-circle between real ports with a documented Suez/Cape detour rule; rail (China–Europe Railway Express, ~11,000 km) and air use real distances and cited speed/cost ratios. Capacities and per-unit costs are synthetic. |
| Suppliers (8), their capacity, cost, lead time, reliability | **Synthetic** | No public dataset carries these. Names, regions and numbers are generated (Phase 3), and cover **only three products**. |
| Tariff rates | **Real** | World Bank WDI, weighted-mean applied tariff, latest year per country (country-level: the world's public data has no product-level granularity). A *scenario's* tariff increase is a parameter, not data. |
| Disruption history | **Real** | NOAA Storm Events (69,801 events, US-only, 2024) and four curated real events (e.g. the 2021 Suez blockage). Shown as reference, never as live feed. |
| Shipments | **None exist** | There is no shipment dataset. The "shipments" shown are what the optimizer's plan *proposes* (`PROPOSED`, then `PLANNED` once approved) and "shipments at risk" are the modelled plan's, not observed. |
| Costs and prices | **Synthetic unit** | Everything is in "cost units". There is no currency peg, and no stock-out penalty is modelled, so shortfalls are reported in units, never converted to money. |
| World map | **Real** | Natural Earth 110m land polygons (public domain), bundled with the app. |

## Behaviour

| Component | Status | What it really does |
|---|---|---|
| Sensing Agent | **Real LLM, fenced** | Google Gemini reads free text and *proposes* a structured event. Plain Python validates every field and id against the actual network; a bad candidate is dropped whole; the model can't choose event ids or touch state. A defined scenario supplies a structured trigger and skips the model (still validated). |
| Inventory / Logistics / Sourcing agents | **Real, deterministic** | Tool functions over the data above: forecast → stockout risk → transfer; route capacity, cost, ETA, alternatives; supplier capacity and landed cost including tariffs. |
| Optimization Engine | **Real** | An integer program solved with HiGHS (scipy) — a "Prototype Optimization", labelled as such in every response. Every plan is re-checked by an independent validator; infeasible problems return a diagnosis, never a fake plan. |
| Compliance Agent | **Real, deterministic** | Four rule checks read from `backend/config/compliance_rules.yaml`. **No LLM.** The sanctions and restricted-country lists ship **empty** — inventing a list would be irresponsible — so a rejection appears only if someone configures one (tests do). |
| Human approval | **Real workflow, unauthenticated** | A named decider, tied to the plan version they were shown, recorded in an append-only audit trail. There is no login: the name is typed. |
| Scenario comparison | **Real, simple** | "Do nothing" = the baseline plan with what the disruption invalidates removed. A modelled counterfactual — not a simulation of how an organisation would scramble. |
| Port congestion, demand surge | **Not modelled** | The pipeline records such events but nothing acts on them; the Scenarios page says so instead of showing a number. |

## Integrations

| | Status |
|---|---|
| SAP IBP / S/4HANA / BTP / AI Core / Event Mesh | **Not connected.** A target architecture is documented in [architecture.md](architecture.md) §2 and the optimizer and the world-state store sit behind interfaces so an SAP-backed adapter is a swap, not a rewrite. The UI's footer says "not connected". |
| Purchase orders, ERP write-back | **None.** "Approve" finalizes the plan *in this app's world state* and nothing else. |
| Live data feeds (AIS, news, weather APIs) | **None.** A report is typed in or comes from a scenario definition. |

## Known limits (as of the last phase)

Only products 22197 and 84077 have a feasible plan (23166 is infeasible by design; the other 37 have no
suppliers). One product per run. One process and SQLite. The demand model is weakest at the end of the data
(drift and a backtest error of ≈ 77% over the last 14 days — the Agent Monitor shows both). No CI configuration.
See the per-phase "Known limits" in [implementation-plan.md](implementation-plan.md).
