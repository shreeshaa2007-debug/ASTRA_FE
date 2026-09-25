# ResilientSC — Data Plan (Phase 1, updated after Phase 2)

**Phase 2 has run.** The real outcome — what was actually downloaded, inspected,
and measured — lives in [data/dataset_registry.yaml](../data/dataset_registry.yaml)
with real row/column counts, license text, and quality issues; see the summary
at the bottom of this document. What follows below is kept as originally
written in Phase 1: the scouting hypothesis, before anything was downloaded.
Several candidates named here didn't pan out (Kaggle credential gate, aggregate
grain, bot-blocked) — the registry is the source of truth, this section is the
paper trail for why each choice was made.

## Internal schemas (target — unchanged from the brief)

`SHIPMENTS`, `INVENTORY`, `DEMAND`, `SUPPLIERS`, `ROUTES`, `DISRUPTIONS`,
`TARIFFS` — fields exactly as specified in the brief. Every raw dataset below gets
mapped onto these seven, not the other way around; the ML/agent code never sees
source-specific column names, only the internal schema in `backend/schemas/`.

## Candidate sources by category

### A. Demand forecasting
- **M5 Forecasting – Accuracy** (Walmart, via Kaggle). Daily unit sales across
  ~3,000 products / 10 stores, multiple years, includes calendar events and
  price/promotion signals. Maps to `DEMAND` directly (`date`, `product_id`,
  `location_id`, `demand_quantity`); the calendar/event columns are exactly the
  "seasonality indicators" and disruption-aware features §6 asks for.
  License: Kaggle competition terms — usable for a hackathon demo, **redistribution
  needs confirming** before it goes in a public repo; if restricted, `data/raw/`
  stays gitignored and a download script pulls it at setup time instead.
- **Store Item Demand Forecasting Challenge** (Kaggle) as a smaller/faster
  fallback if M5's size is unwieldy for the hackathon timeline.

### B. Supplier information
- **Open Supply Hub** (opensupplyhub.org). Real, open-license (CC BY-SA) database
  of manufacturing facilities worldwide — name, address, sector, parent company.
  Gives realistic supplier identity/location data for `SUPPLIERS.supplier_name`,
  `location`. It does **not** carry capacity, lead time, unit cost, or reliability
  — those fields don't exist in any public dataset I know of (they're commercially
  sensitive by nature), so `SUPPLIERS.capacity/unit_cost/lead_time_days/reliability`
  will be **synthesized on top of real supplier identities**, with the synthesis
  method documented in the preprocessing code, not left implicit. This is called
  out now so it isn't a surprise in Phase 2 — it's the honest answer, not a gap to
  paper over.

### C. Inventory
- No public dataset I'm aware of ships clean `opening_stock/inbound/outbound/
  closing_stock/safety_stock` time series at warehouse×product grain — that's
  internal ERP data almost nobody publishes. Plan: **derive** `INVENTORY` from the
  demand data (A) and shipment data (D) during preprocessing — closing stock as a
  running balance from a reasonable starting stock, inbound from shipment
  `actual_arrival`, outbound from `DEMAND.demand_quantity`, safety stock as a
  configurable service-level formula. This is simulation-grade, not a real
  historical inventory ledger, and will be labeled as such everywhere it surfaces
  (matches the "Prototype Optimization" labeling pattern in architecture.md §2).

### D. Transportation / logistics
- **DataCo Smart Supply Chain Dataset** (Kaggle). ~180k order/shipment records:
  shipping mode, scheduled vs. actual shipping days, late-delivery flag, order
  region/market, product, sales. Maps well to `SHIPMENTS` (`transport_mode`,
  `departure_date`/`expected_arrival`/`actual_arrival` via the schedule fields,
  `status` via the late-delivery flag). License listed as public domain on
  Kaggle — **verify exact terms in Phase 2** before relying on it.

### E. Ports / routes
- **World Port Index** (US NGA — National Geospatial-Intelligence Agency).
  Public domain (US government work). ~3,700 ports worldwide with coordinates and
  characteristics. Source of truth for port master data — Shanghai, Singapore,
  Rotterdam, Jebel Ali, etc. — feeding `ROUTES.origin/destination`.
- **CERDI-Searoute dataset** (CERDI, French research institute). Maritime
  distances between ports/countries via named canal/cape waypoints, including
  Suez and Cape of Good Hope alternatives — this is the closest thing to a real
  dataset that directly encodes "distance via Suez vs. distance via Cape of Good
  Hope," which is exactly the Suez-closure scenario's core mechanic. License:
  research use with attribution — **confirm hackathon-compatibility in Phase 2**.
  Feeds `ROUTES.distance/transit_time` for both the normal and rerouted paths.

### F. Disruptions / events
- Disruption events are inherently sparse (a Suez closure is a handful of
  real-world occurrences, not a big-data category), so this will **not** be a
  large ML dataset — it'll be a small, manually curated event log built from
  public historical record (e.g., the 2021 Ever Given/Suez closure dates and
  duration, documented port-congestion episodes) plus the four other scenario
  types the brief lists as synthetic/parameterized scenario definitions (see
  [model-plan.md](model-plan.md) is not the right place — scenario definitions
  live in `backend/simulation/`, per architecture.md §6). `EM-DAT` (CRED
  disaster database) is a candidate if a broader severe-weather event set is
  wanted later; needs free registration and its license restricts resale, which
  is fine for a non-commercial hackathon demo but gets flagged, not assumed.

### G. Tariffs / trade
- **WITS — World Integrated Trade Solution** (World Bank/UNCTAD/WTO joint
  portal). Public, bulk-downloadable applied tariff rates by country pair and HS
  product code. Maps directly to `TARIFFS` (`origin_country`,
  `destination_country`, `product_id/product_category`, `tariff_rate`).
  Used for the "Tariff Increase" scenario and the optimization engine's
  tariff-cost term.

### H. Weather
- **NOAA Storm Events Database**. Public domain (US government). Real severe
  weather events with location, date, type, and impact fields — feeds the
  "Severe Weather" scenario with real event shapes rather than an invented one.

## Phase 2 outcome (real, measured — see the registry for full detail)

| Category | Hypothesis above | What actually happened |
|---|---|---|
| A. Demand | M5 / Store Item (Kaggle) | Both are Kaggle-gated (no credentials in this environment). Substituted **UCI Online Retail** — real, no-auth, downloaded: 541,909 transaction rows, 8 columns, 2010-12 to 2011-12, 38 countries, 4,070 products. `ACQUIRED`. |
| B. Suppliers | Open Supply Hub | API requires a registered token — every unauthenticated call returned 401. `NOT_ACQUIRED`, capacity/cost fields synthesized as planned. |
| C. Inventory | Derive from A+D | Unchanged — still deriving, now from A (acquired) once D is settled. `NOT_ACQUIRED` (by design). |
| D. Logistics | DataCo (Kaggle) | Kaggle-gated. Two non-Kaggle alternatives tested: FHWA FAF5 (real, downloaded fine, but state-to-state aggregate — wrong grain for `SHIPMENTS`) and BTS Port Performance (403, bot-blocked). `NOT_ACQUIRED` — needs a human with Kaggle credentials, or a small hand-built shipment set in Phase 3. |
| E. Ports/routes | World Port Index + CERDI-Searoute | World Port Index downloaded via HDX mirror: 3,669 ports, 78 columns — `ACQUIRED` (flagged as a 2017-dated snapshot). CERDI-Searoute not yet pulled — access terms unconfirmed, deferred to Phase 3. |
| F. Disruptions | Small curated log + EM-DAT maybe | Unchanged in kind; NOAA Storm Events now grounds the weather scenario's real shape. `PARTIAL`. |
| G. Tariffs | WITS (country-pair × HS code) | WITS's granular API wasn't wired up in this pass (needs a reporter/partner/product code lookup). Substituted **World Bank WDI's weighted-mean-tariff indicator** — real, downloaded: 265 countries, 1960–2025. Coarser grain (country-year, not country-pair × product) than the internal `TARIFFS` schema wants — recorded as a Phase 3 follow-up, not silently worked around. `ACQUIRED`. |
| H. Weather | NOAA Storm Events | Downloaded as planned: 69,801 US events for 2024, 51 columns. `ACQUIRED`. |

**4 real datasets acquired, 152MB total, in `data/raw/` (gitignored).** Nothing
below Phase 2 in the plan changes because of this — Phase 3 preprocessing
proceeds on what's real, with the `NOT_ACQUIRED`/`PARTIAL` entries' documented
fallback (synthesis, manual curation, or a later credentialed pull) rather than
blocking on them.
