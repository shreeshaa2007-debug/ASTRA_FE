# ResilientSC data readiness report

Generated 2026-09-29T06:42:07 UTC by `python -m backend.services.preprocessing.cleaned.build` in 86.5 s. This file is rendered from `manifest.json`; the numbers are the run's, not typed in. Nothing has been created in SAP HANA and nothing has been deployed.

## 1. Verdict

* **137 of 137 integrity checks passed** (keys unique, foreign keys resolve, cancelled orders are not demand, the inventory identity holds, the normal baseline has every supplier ACTIVE, tariffs equal the World Bank file, ...). The build refuses to finish if one fails.
* **The sources were not touched:** `data/raw` is byte-for-byte unchanged (SHA-256 of 25 files compared before and after), and so is `data/processed`, which the running application still reads.
* **17 tables are ready to load into SAP HANA Cloud** (2 more are ready but optional, 7 is ready but recommended to stay in the file layer). The list is in section 9.
* **Ready means the data is internally consistent and correctly typed, not that the numbers are true.** The suppliers, routes' costs and capacities, inventory and scenarios are SYNTHETIC by necessity; section 6 lists what remains weak.

## 2. What was fixed, against the ten requests

1. **Cancellation pairs.** 541,909 workbook rows each received exactly one disposition (they sum to the row count). 7,397 cancellations were fully matched and 56 partly matched to the sale they reverse (same customer and product, most recent earlier sale first), removing **248,962 units** from net demand. The two known phantom orders (74,215 units of 23166 and 80,995 units of 23843, each cancelled minutes later) now net to zero. 18,190 cancelled units had no earlier sale in the workbook and 2,306 had no customer id; those are not netted (assumption A02). The pairing is in `data/interim/cleaning/cancellation_pairs.csv`, and the raw workbook is untouched.
2. **`demand.csv` and `demand_modeling_panel.csv` regenerated** from the corrected lines, with provenance DERIVED. Phase 3 demand of 5,625,725 units becomes 5,308,637, and the gap is accounted for to the unit: 248,962 cancelled, 68,018 in rows priced at zero or less (stock adjustments and give-aways), 108 in rows with stock codes the Phase 3 list missed (discounts, samples, vouchers) (the bridge first reproduces the Phase 3 total exactly, then subtracts).
3. **Inventory regenerated** as a dense grid of 3 warehouses x 40 products x 374 days = 44,880 rows, so `(warehouse_id, product_id, date)` is unique by construction (Phase 3: 27,901 repeated keys under the single id ['DEFAULT']). Lost sales are recorded (3,857 unfilled units, 0.503% of demand) instead of being hidden.
4. **Supplier baseline fixed.** `supplier` and `supplier_product` hold nominal properties only, with no status. Phase 3 stored {'S001': 'DISRUPTED', 'S002': 'REDUCED', 'S003': 'ACTIVE', 'S004': 'ACTIVE', 'S005': 'ACTIVE', 'S006': 'ACTIVE', 'S007': 'ACTIVE', 'S008': 'ACTIVE'} in the master. Disruption is now `scenario_state`; `BASELINE_NORMAL` has no rows (every supplier ACTIVE, every lane NORMAL) and the old demo start survives as the scenario `DEMO_LEGACY_START`.
5. **Routes.** Sea distances are now summed along the map's land-checked sea-lane waypoints, not straight lines across land: SHA-ROT-SUEZ 11,426 -> 20,041 km, SIN-ROT-SUEZ 11,407 -> 15,928 km, MUM-ROT-SUEZ 7,500 -> 12,350 km, CHE-ROT-SUEZ 8,510 -> 14,257 km. Every origin now has a Suez and a Cape lane; Mumbai and Chennai had none (`MUM-ROT-CAPE` and `CHE-ROT-CAPE` added). The old distance stays in `legacy_distance_km`.
6. **Supplier-product relationships.** Suppliers are named `SYNTHETIC Supplier S00x` and carry `provenance = SYNTHETIC`; the key is `(supplier_id, product_id)`. Netting cancelled orders takes products out of the modeling panel (20713: 11,429 units gross, 11,186 net; 23166: 78,033 units gross, 3,539 net), so the supplier products are re-chosen by the same rule as before (the three highest-volume panel products): ['22197', '23166', '84077'] -> ['22197', '84077', '85099B'].
7. **Tariffs.** 3,771 observations exactly as the World Bank publishes them (no value added, filled or rounded; a check compares them to the file). 143 countries are CURRENT for 2022, 45 STALE (up to 20 years old), 29 have NO_DATA. Extreme or discontinuous values are flagged, not changed.
8. **Disruptions separated.** `weather_event_noaa` (69,801 real NOAA events, REAL), `disruption_event` (4 hand-written historical events, AUTHORED, each with a verification status: {'UNVERIFIED_IN_WORKSPACE': 3, 'CORROBORATED_BY_WDI': 1}) and `scenario*` (hypothetical stress tests, SYNTHETIC) are three different tables.
9. **`data/cleaned/`** holds 26 tables plus `manifest.json` and `data_dictionary.csv`.
10. **This report.**

### Decisions worth reviewing

These are choices this layer made that you may want to reverse; each has a consequence when the application starts reading `data/cleaned`.

* **`data/processed` was left untouched, not overwritten.** "Regenerate `demand.csv` and `demand_modeling_panel.csv`" was read as "into the new layer", so the running application, the trained model and the existing tests are unaffected until someone switches them over.
* **`demand.csv` no longer has lag and rolling features.** Phase 3 computed them on the sparse series, where "lag_1" meant "the previous day with a sale". They live on the dense panel, where they mean what they say.
* **Freight cost per unit rises by 21% to 75% on the 6 sea lanes Phase 3 already had**, because cost is proportional to distance (A12) and the corrected distances are longer. Freight now weighs more against supplier cost in the optimizer; the plans it produces for the same scenarios will differ.
* **Unit costs were left abstract, not rescaled** (section 6, limitation 1): rescaling needs a decision about what the unit is.
* **Supplier names changed** to `SYNTHETIC Supplier S00x`, and one supplier product changed (item 6 above). Both show in the UI once it switches.
* **Late returns are netted on the original sale's date** (A01; section 6, limitation 2), so demand is what customers kept.
* **A fourth provenance label, AUTHORED,** was added for hand-written records of real events, because calling them REAL would overstate their verification and calling them SYNTHETIC would say they were invented.

## 3. Files created

| File | Rows | Cols | Primary key | Provenance | Size | What it is |
|---|---|---|---|---|---|---|
| `country.csv` | 217 | 7 | iso3 | REAL | 13.3 KB | 217 World Bank countries with the ISO-2 code and retail label the data needs; the join key for tariffs, ports, demand and suppliers. |
| `port.csv` | 3,669 | 10 | port_id | REAL | 0.36 MB | All 3,669 World Port Index ports (2017 snapshot), keyed by the WPI's own INDEX_NO. |
| `product.csv` | 3,798 | 11 | product_id | REAL | 0.34 MB | Every product that has a sale line: name, median price, ABC class and volume from the corrected net demand. |
| `warehouse.csv` | 3 | 6 | warehouse_id | SYNTHETIC | 0.3 KB | Three synthetic warehouses in India that the inventory ledger is split across. |
| `supplier.csv` | 8 | 8 | supplier_id | SYNTHETIC | 0.6 KB | Eight fictitious suppliers, named SYNTHETIC. Nominal master data only: no status. |
| `supplier_product.csv` | 14 | 7 | supplier_id, product_id | SYNTHETIC | 0.6 KB | Which supplier carries which product, with nominal capacity, unit cost, lead time and reliability. |
| `route.csv` | 10 | 17 | route_id | SYNTHETIC | 2.6 KB | Ten lanes: a Suez and a Cape lane for each of four origins, plus one rail and one air lane. |
| `tariff.csv` | 3,771 | 9 | origin_iso3, dest_iso3, hs_section, effective_year | REAL | 0.47 MB | The World Bank tariff series as published: country and year, no value filled or changed. |
| `disruption_event.csv` | 4 | 11 | event_id | AUTHORED | 1.3 KB | Four hand-written historical events (AUTHORED), each with a verification status. |
| `disruption_impact.csv` | 4 | 7 | event_id, entity_type, entity_id | AUTHORED | 0.7 KB | Which lanes a historical event blocked (an inference, labelled). |
| `scenario.csv` | 9 | 8 | scenario_id | SYNTHETIC | 1.9 KB | The scenarios: the normal baseline, the six of scenarios.yaml, a Red Sea diversion and the legacy demo start. |
| `scenario_state.csv` | 13 | 7 | scenario_id, entity_type, entity_id | SYNTHETIC | 1.7 KB | What each scenario does to which lane or supplier. Only deviations from normal are written. |
| `scenario_param.csv` | 10 | 8 | scenario_id, param_key, qualifier | SYNTHETIC | 1.0 KB | A scenario's numbers: duration, severity, tariff change per country. |
| `inventory_policy.csv` | 3 | 9 | warehouse_id | SYNTHETIC | 0.3 KB | The parameters the inventory simulation used, per warehouse. |
| `inventory.csv` | 44,880 | 13 | warehouse_id, product_id, date | SYNTHETIC | 2.89 MB | A simulated stock ledger, one row per warehouse, product and day, with lost sales recorded. |
| `demand.csv` | 300,837 | 8 | date, product_id, location_id | DERIVED | 14.91 MB | Net demand per day, product and country (cancellations netted out), no features. |
| `demand_modeling_panel.csv` | 14,960 | 18 | date, product_id, location_id | DERIVED | 2.02 MB | The 40 forecastable series on a dense daily calendar, with lag and rolling features and a time split. |
| `sales_order_line.csv` | 522,038 | 14 | order_id, line_no | REAL | 46.97 MB | Every priced sale line of the workbook with gross, cancelled and net quantity: the lineage behind demand. |
| `tariff_latest.csv` | 217 | 10 | origin_iso3 | REAL | 29.7 KB | One row per country: latest value, how stale it is, or NO_DATA. |
| `weather_event_noaa.csv` | 69,801 | 16 | event_id | REAL | 11.58 MB | 69,801 real US storm events of 2024 with parsed damage and a derived severity. |
| `ntm_prevalence_sector.csv` | 3,943 | 7 | reporter_iso3, sector, ntm_type_count_bucket | REAL | 0.77 MB | Non-tariff measure prevalence by country and sector (UNCTAD/WITS-family structure): the share of each reporter-sector's products falling in each NTM-count bucket. |
| `supply_chain_pressure_index.csv` | 297 | 18 | date | REAL | 0.12 MB | Monthly macro/supply-chain-pressure indicators (CPI, industrial production, oil price, GSCPI, Port of LA vessel dwell time), 2001-01 to 2025-09. |
| `geopolitical_event_synthetic.csv` | 10,003 | 10 | event_id | SYNTHETIC | 1.78 MB | 10,003 SYNTHETIC geopolitical events (2015-2026) from a Kaggle sample-data bundle; verified fabricated (future dates, near-uniform category distribution). 3 rows use real event names/dates. |
| `trade_route_synthetic.csv` | 31,300 | 22 | week_date, route_id | SYNTHETIC | 8.05 MB | 31,300 SYNTHETIC weekly trade-route observations (50 routes x 626 weeks) from the same Kaggle bundle; freight cost, congestion and risk scores are all fabricated. |
| `commodity_market_synthetic.csv` | 626 | 9 | week_date | SYNTHETIC | 0.14 MB | 626 weekly SYNTHETIC commodity prices (oil, gas, steel, wheat, copper) from the same Kaggle bundle; does not reproduce the real 2020 COVID oil-price crash. |
| `country_metadata_synthetic.csv` | 10 | 11 | iso3 | SYNTHETIC | 2.1 KB | 10 countries with SYNTHETIC (scrambled) population/GDP/income-group attributes from the same Kaggle bundle. |

Also written: `manifest.json` (hashes, counts, every check), `data_dictionary.csv` (dtype, nulls and the provenance of every column), and, outside the layer, the cancellation audit tables `data/interim/cleaning/cancellation_pairs.csv` and `cancellation_outcomes.csv`.

## 4. Provenance

`provenance` is on every row, in upper case (the Phase 3 files use lower case, so the two layers cannot be confused).

| Label | Meaning |
|---|---|
| REAL | measured, from a public dataset in `data/raw`, carried through unchanged |
| DERIVED | computed from REAL data by a documented rule |
| SYNTHETIC | generated because no public source exists; an assumption, never evidence |
| AUTHORED | written by hand about a publicly reported real-world event; not machine-verified in this workspace |

A row carries the provenance of the fact it asserts. Where a table mixes, the columns that differ are declared in `data_dictionary.csv`:

| Table | Column | Column provenance | Row provenance |
|---|---|---|---|
| country | iso2 | AUTHORED | REAL |
| country | retail_label | AUTHORED | REAL |
| port | country_iso3 | DERIVED | REAL |
| product | avg_unit_price_gbp | DERIVED | REAL |
| product | abc_class | DERIVED | REAL |
| product | net_units | DERIVED | REAL |
| product | net_revenue_gbp | DERIVED | REAL |
| product | active_days | DERIVED | REAL |
| product | first_sale_date | DERIVED | REAL |
| product | last_sale_date | DERIVED | REAL |
| product | is_forecast_series | DERIVED | REAL |
| route | origin_port_id | AUTHORED | SYNTHETIC |
| route | destination_port_id | AUTHORED | SYNTHETIC |
| route | via | DERIVED | SYNTHETIC |
| route | chokepoints | DERIVED | SYNTHETIC |
| route | distance_km | DERIVED | SYNTHETIC |
| route | legacy_distance_km | DERIVED | SYNTHETIC |
| route | transit_time_days | DERIVED | SYNTHETIC |
| sales_order_line | quantity_cancelled | DERIVED | REAL |
| sales_order_line | quantity_net | DERIVED | REAL |
| sales_order_line | country_iso3 | DERIVED | REAL |
| sales_order_line | is_quantity_outlier | DERIVED | REAL |
| tariff_latest | reference_year | DERIVED | REAL |
| tariff_latest | staleness_years | DERIVED | REAL |
| tariff_latest | data_status | DERIVED | REAL |
| weather_event_noaa | state | DERIVED | REAL |
| weather_event_noaa | location | DERIVED | REAL |
| weather_event_noaa | severity | DERIVED | REAL |
| weather_event_noaa | damage_property_usd | DERIVED | REAL |
| weather_event_noaa | damage_crops_usd | DERIVED | REAL |
| weather_event_noaa | casualties | DERIVED | REAL |

Rows by provenance: REAL 607,751, DERIVED 315,797, SYNTHETIC 86,889, AUTHORED 8.

## 5. Assumptions

Every number that shapes the data and is not measured. Defined once in `backend/services/preprocessing/cleaned/assumptions.py`.

| ID | Area | Assumption | Label | If it is wrong |
|---|---|---|---|---|
| A01 | demand | A cancellation invoice (InvoiceNo starting 'C') reverses the most recent earlier sale of the same product to the same CustomerID (last-in-first-out), spilling into older sales if it is larger than the latest; the reversal is booked on the ORIGINAL sale's date, so a cancelled order never appears as demand. | AUTHORED | First-in-first-out would move some reversals to older orders; totals do not change, dates of a minority of units do. |
| A02 | demand | A cancellation with no earlier sale in the workbook (the sale pre-dates 2010-12-01) or without a CustomerID is not netted: there is no date to book it on, and booking it on the cancellation date would create negative demand. | AUTHORED | Net demand is slightly overstated by the units of returns whose sale is outside the data window. |
| A03 | demand | Rows with a negative quantity on a non-'C' invoice (write-offs: 'damaged', 'check', 'thrown away') and rows with a price <= 0 are stock adjustments or give-aways, not customer demand, and are excluded. | AUTHORED | Those units would otherwise count as demand; the demand bridge in the manifest gives their exact number. |
| A04 | demand | Exact duplicate rows (all eight columns equal) are one line entered twice and are dropped, as in Phase 3. | AUTHORED | A genuine second scan of the same item on one invoice would be undercounted (0.97% of rows). |
| A05 | demand | Codes for postage, fees, discounts, samples, bad-debt adjustments and gift vouchers are not products. | AUTHORED | A code wrongly excluded removes real demand; the list is short and printed in the manifest. |
| A06 | demand | Rows whose Country is 'Unspecified' or 'European Community' have no destination and are excluded. | AUTHORED | About 0.1% of rows; demand at a location cannot include them. |
| A07 | demand | A sale line is flagged as a quantity outlier if its net quantity is above Q3 + 3.0 x IQR of net line quantities. Flagged, never removed. | AUTHORED | Models that want to cap large orders can use the flag. |
| A08 | modeling | The modeling panel is the top 40 (product, location) series by net volume among series with at least 100 active days, on a dense daily calendar (days without a sale are zero demand); split 70/15/15 by time. | AUTHORED | Which products are in the panel changes if the thresholds change. |
| A09 | inventory | Inventory is a simulation, not an observation. Start stock = 30 days of cover, safety stock = 10 days (x a warehouse multiplier), replenish 21 days of demand whenever closing stock would fall below safety stock; all sized on the FULL-YEAR mean of net demand (a simulation seed, not a forecast) and replenished with a 0-day lead time. | SYNTHETIC | Instant replenishment flatters availability; stock-outs here are a lower bound. Do not use as a backtest of an inventory policy. |
| A10 | inventory | Each product's demand is split across three warehouses in fixed shares {'Mumbai': 0.45, 'Chennai': 0.3, 'Delhi': 0.25} by largest remainder, so integer units are conserved exactly. The warehouses are in India while the demand is UK retail: the split is an illustration, not geography. | SYNTHETIC | The Inventory Agent's transfer logic is exercised, not validated. |
| A11 | routes | A sea lane's distance is the sum of great-circle legs between the waypoints of scripts/build_lanes.py (lanes checked against the Natural Earth 110m coastline). Two lanes the map does not have (Mumbai and Chennai round the Cape) get waypoints authored here and checked the same way. The result is an approximation of a shipping lane, not a vessel track or a published sea-distance table. | AUTHORED | Distances could be off by several percent either way; the Suez-versus-Cape ordering is what matters. |
| A12 | routes | Sea transit = distance / 18.0 knots. Rail (China-Europe Railway Express) = 11000 km, 15-18 days. Air = great circle at 800 km/h plus 1.5 days handling. Cost per unit = 0.012 x sea km; rail costs 2.0x and air 6.0x the same lane's Suez sea cost. Capacity {'sea': 8000, 'rail': 2000, 'air': 200}. All carried over from Phase 3; none has a public source in this workspace. | SYNTHETIC | Freight costs are placeholders in abstract cost units. |
| A13 | suppliers | The supplier roster (ids S001-S008, countries, risk tiers) is fictitious and labelled so. Capacity, unit cost, lead time and reliability are drawn from seeded uniform ranges; reliability follows the supplier's risk tier, not its current status. Each (supplier, product) pair has its own random stream, so adding a product never changes another pair's numbers. | SYNTHETIC | Nothing about a real supplier is implied. |
| A14 | suppliers | Supplier unit cost and route cost are in ABSTRACT COST UNITS. They are not pounds and are not commensurate with the retail price in product.avg_unit_price_gbp (a cost of ~100 against a retail price of ~1). | SYNTHETIC | Only relative comparisons and scenario deltas are meaningful; an absolute cost is not. |
| A15 | suppliers | The supplier-carrying products are the 3 highest-volume products in the modeling panel (the Phase 3 rule, re-applied to corrected demand), so that suppliers, forecasts and stock refer to the same products. | AUTHORED | The products differ from Phase 3 because the old top three included an order that was cancelled. |
| A16 | scenarios | A DISRUPTED supplier keeps 0% of nominal capacity and a REDUCED one 50%. The current agents act only on DISRUPTED; REDUCED is recorded for when they do. | SYNTHETIC | REDUCED behaviour is a placeholder. |
| A17 | scenarios | The Red Sea scenario makes every lane through Bab-el-Mandeb unavailable for 90 days. The duration is illustrative; no real traffic, delay or cost figure is asserted. | SYNTHETIC | It is a stress test, not a forecast. |
| A18 | reference | Port names in the route table are matched to World Port Index records by hand: Singapore -> 50000 'KEPPEL - (EAST SINGAPORE)' (the WPI has no port named Singapore), Mumbai -> 48840, Chennai -> 49450, Shanghai -> 59970, Rotterdam -> 31140. | AUTHORED | A different Singapore terminal would change no distance by more than a few km. |
| A19 | reference | ISO-2 codes and the retail country labels ('EIRE', 'RSA', ...) are mapped to ISO-3 by hand for the countries the data uses. Only those countries have an ISO-2 code, so a port outside them has no ISO-3. | AUTHORED | The country table is not a complete ISO 3166 list. |
| A20 | tariffs | The tariff reference year is the latest year in which at least 100 countries report. A country whose latest value is older is STALE, one with none is NO_DATA. Values above 50% or moving by >= 10 points from the previous observation are flagged, not changed. | AUTHORED | Flags are informational; no tariff value was altered or filled. |
| A21 | products | ABC class is by cumulative net revenue: A up to 80%, B up to 95%, C the rest. A product's price is the median of its priced sale lines. | AUTHORED | A revenue ranking is a proxy for criticality, not a measure of it. |

## 6. Remaining limitations


1. **Costs are abstract.** Supplier unit cost is 86 to 118, against retail prices of about 0.29 to 2.08 GBP for the same products, and route cost per unit is 148 to 1443. They are cost units (A14), not pounds. Scenario deltas and rankings are meaningful; an absolute cost is not. This was not changed because it needs a decision about the unit.
2. **Cancellations are paired by heuristic.** An invoice line carries no reference to the sale it reverses, so the pairing uses customer and product (A01). 27% of the netted units were reversed more than a day after the sale (median lag 9.87 days, per pair): these are returns as much as voided orders, and they are netted on the original order's date, so demand is what customers kept, not what they first asked for. A gross view stays available in `sales_order_line`.
3. **Only 3 of 3,798 products have suppliers** (0.08% of products, 3.0% of net demand units). The suppliers are fictitious and nothing about a real firm is implied.
4. **Demand is one year of a UK gift wholesaler.** 374 days, one seasonal cycle, dominated by the United Kingdom, and intermittent: only 981 of 18,907 product-country series have >= 100 active days. `disruption_active` is constant False because no disruption overlaps 2010-2011; do not use it as a feature.
5. **The trained forecast model is stale.** `ml/artifacts/xgboost_demand` was trained on the Phase 3 panel. 2 products left the panel (['20713', '23166']) and 2 joined (['23201', '84568']), and the demand values changed. It has not been retrained (not requested).
6. **Inventory is a simulation.** Instant replenishment, full-year-mean sizing, and three warehouses in India serving UK demand (A09, A10). Stock-outs (26 warehouse-days) are a lower bound.
7. **Sea distances are approximate** (A11): waypoint lanes, not vessel tracks. Shanghai-Rotterdam via Suez is 20,041 km here. Published sea-distance tables are commonly cited near 19,000 to 19,500 km for that voyage; that figure is general knowledge, not a source in this workspace, and was not verified. Transit speed, rail and air constants, freight cost and capacity have no public source here.
8. **No Hormuz and no real Red Sea data.** The lanes have no Gulf leg, and no dataset in the workspace covers the 2023-24 Red Sea events; `RED_SEA_DIVERSION` is an illustrative stress test (A17).
9. **Tariffs are country-level.** No partner or product dimension (`dest_iso3 = ANY`, `hs_section = ALL`). EU members carry the same value. 45 countries are stale and 29 have no value; the flagged values are {'OK': 3707, 'JUMP_GE_10PP': 55, 'EXTREME_VALUE;JUMP_GE_10PP': 6, 'EXTREME_VALUE': 3}.
10. **The authored events are unverified in the workspace** ({'UNVERIFIED_IN_WORKSPACE': 3, 'CORROBORATED_BY_WDI': 1}). Only the 2019 tariff event was checked, against the World Bank series (US +12.19 points, 2018 to 2019). NOAA data is US weather only and overlaps nothing else.
11. **Only 2,410 of 3,669 ports have an ISO-3 country** (A19); the rest need a full ISO 3166 table. 24 port names repeat within a country.
12. **The application still reads `data/processed`.** Switching it to the cleaned layer is a separate change: `scenarios.yaml`'s SEVERE_WEATHER must list `MUM-ROT-CAPE` too, `frontend/src/data/lanes.json` must draw the two new lanes (a test asserts the drawn lanes equal the route ids), the baseline loader must apply `scenario_state` instead of reading supplier status, `route.status` becomes `lane_role`, and `backend/data/datasets.py`'s column contract gains the new columns.
13. **Six tables added in a later pass, all `NOT_LOADED` (file layer only, not proposed for HANA yet).** `ntm_prevalence_sector` (3,943 rows, 75 reporters) and `supply_chain_pressure_index` (297 monthly rows, 2001-01-01 to 2025-09-01) are REAL but their exact publisher URLs were not independently re-verified in this workspace (both files were provided directly, not downloaded from a logged URL). `geopolitical_event_synthetic` (10,003 rows), `trade_route_synthetic`, `commodity_market_synthetic` and `country_metadata_synthetic` are SYNTHETIC (verified fabricated: dates run to 2026-12-31, no 2020 oil-price crash, scrambled real-country attributes) and exist only for Sensing-agent stress-test volume — 3 of the 10,003 geopolitical-event rows use a real event's name and date (COVID Supply Shock, the Russia-Ukraine War, the Red Sea Crisis) but still carry unsourced numeric fields, so the whole row stays SYNTHETIC. None of the six is joined to or mixed with the REAL/AUTHORED tables above.

## 7. Keys and relationships

| Child column | Parent key |
|---|---|
| `port`.country_iso3 | `country`.iso3 |
| `supplier`.country_iso3 | `country`.iso3 |
| `supplier`.origin_port_id | `port`.port_id |
| `supplier_product`.supplier_id | `supplier`.supplier_id |
| `supplier_product`.product_id | `product`.product_id |
| `warehouse`.country_iso3 | `country`.iso3 |
| `warehouse`.nearest_port_id | `port`.port_id |
| `route`.origin_port_id | `port`.port_id |
| `route`.destination_port_id | `port`.port_id |
| `sales_order_line`.product_id | `product`.product_id |
| `sales_order_line`.country_iso3 | `country`.iso3 |
| `demand`.product_id | `product`.product_id |
| `demand`.country_iso3 | `country`.iso3 |
| `demand_modeling_panel`.product_id | `product`.product_id |
| `inventory`.warehouse_id | `warehouse`.warehouse_id |
| `inventory`.product_id | `product`.product_id |
| `inventory_policy`.warehouse_id | `warehouse`.warehouse_id |
| `tariff`.origin_iso3 | `country`.iso3 |
| `tariff_latest`.origin_iso3 | `country`.iso3 |
| `disruption_impact`.event_id | `disruption_event`.event_id |
| `scenario`.based_on_event_id | `disruption_event`.event_id |
| `scenario_state`.scenario_id | `scenario`.scenario_id |
| `scenario_param`.scenario_id | `scenario`.scenario_id |

Not declarable as a plain foreign key (checked by code): `scenario_state.entity_id` is a route or a supplier according to `entity_type`, and `disruption_impact.entity_id` is a route. `supplier_id` alone repeats in `supplier_product`, so the key of that table is the pair.

## 8. Mapping to the proposed HANA tables

The proposed schema is the one in the data-audit report; **no table has been created**. Column names below are the cleaned files' names, and a HANA table should use them. Types are recommendations from the data (text sized at twice the longest value). Create identifiers unquoted (upper case in HANA).

| File | HANA table | Tier | Differs from the proposal |
|---|---|---|---|
| `country.csv` | `country` | CORE | Adds region and income_group. iso2 is NULL for countries the data does not use (assumption A19). |
| `port.csv` | `port` | CORE | Adds country_iso2 and source. country_iso3 is NULL for ports outside the mapped countries. The proposal's chan_depth and cargo_depth are omitted: no agent reads them and their unit could not be verified offline. |
| `product.csv` | `product` | CORE | The proposal's category column is not produced (no source), so leave it out or NULL. avg_unit_price is avg_unit_price_gbp; adds volume and date columns. product_id is text ('85123A'). |
| `warehouse.csv` | `warehouse` | CORE | name is warehouse_name; port_id is nearest_port_id (NULL for inland Delhi); adds city and provenance. |
| `supplier.csv` | `supplier` | CORE | home_port_id in the proposal is origin_port_id here (NULL for S007 and S008, as in the optimizer's configuration). Adds city, region, risk_level. |
| `supplier_product.csv` | `supplier_product` | CORE | The proposal's capacity_per_week is capacity here: the optimizer treats it as a cap over a planning run, with no time basis, so do not name it per-week. unit_cost is in ABSTRACT cost units (A14). |
| `route.csv` | `route` | CORE | dest_port_id is destination_port_id; mode is transport_mode; base_transit_days is transit_time_days; capacity_per_week is capacity (no time basis). Adds lane_role, chokepoints, distance_basis, legacy_distance_km, route_note and the origin and destination labels. |
| `tariff.csv` | `tariff` | CORE | Adds is_country_level_proxy, quality_flag and source. dest_iso3 is always 'ANY' and hs_section 'ALL' (the source has neither dimension); they stay in the key so a finer source can be loaded later. |
| `disruption_event.csv` | `disruption_event` | CORE | region is location; adds estimated_delay_days, status, source_note and verification_status. The provenance CHECK in the proposal (REAL, DERIVED, SYNTHETIC) must also allow AUTHORED. |
| `disruption_impact.csv` | `disruption_impact` | CORE | The proposal's cost_multiplier is not produced (no source). Adds basis and provenance (AUTHORED). |
| `scenario.csv` | `scenario` | CORE | name is scenario_name; adds scenario_type, is_modeled, based_on_event_id, source and provenance. |
| `scenario_state.csv` | `scenario_state` | CORE | A NEW table, not in the proposal: the proposal reused disruption_impact for this, which would have mixed hypothetical stress tests with historical events. |
| `scenario_param.csv` | `scenario_param` | CORE | Adds qualifier (part of the key; 'ALL' when a parameter is not per-country), param_text, unit, basis and provenance. |
| `inventory_policy.csv` | `inventory_policy` | CORE | A NEW table, not in the proposal: the policy is data, so the ledger can be reproduced from it. |
| `inventory.csv` | `inventory_snapshot` | CORE | The proposal held on_hand, safety_stock and reorder_point only. This file also holds the flows (opening, inbound, outbound, closing), demand and unfilled quantity, so the table needs those columns; on_hand is closing_stock. |
| `demand.csv` | `demand_daily` | CORE | The proposal made demand_daily a VIEW over sales_order_line. Because netting is done outside HANA, load this file as a TABLE instead and skip the view (or load both and keep the view for cross-checking). |
| `demand_modeling_panel.csv` | `ref_demand_panel` | CORE | Maps to the EXISTING ref_demand_panel contract, which reads 6 of the 17 columns (date, product_id, location_id, demand_quantity, rolling_mean_28, split). Load those 6; the lag and rolling features stay in the ML layer. |
| `sales_order_line.csv` | `sales_order_line` | OPTIONAL | Not the proposal's quantity + is_cancellation: cancellation invoices are not rows here; each sale line carries quantity_gross, quantity_cancelled and quantity_net instead. quantity_cancelled, quantity_net and is_quantity_outlier are DERIVED. Large (about 520k rows): load it only if you want to recompute demand inside HANA. |
| `tariff_latest.csv` | `tariff_latest` | OPTIONAL | Derivable from tariff and country, so create it as a VIEW rather than loading the file, unless you want the staleness columns materialised. |
| `weather_event_noaa.csv` | `weather_event` | NOT_LOADED | Not in the proposal on purpose: US weather shares no place or year with the demand data or the lanes. Keep it in the file layer as a reference for event durations and the Sensing agent's vocabulary. Ready to load if you want it. |
| `ntm_prevalence_sector.csv` | `ntm_prevalence_sector` | NOT_LOADED | A NEW table, not in the original proposal (added in a later pass). No FK to country: not all 75 reporter codes have been checked against the country master. Source URL/vintage not independently re-verified (dataset_registry.yaml). |
| `supply_chain_pressure_index.csv` | `supply_chain_pressure_index` | NOT_LOADED | A NEW table, not in the original proposal (added in a later pass). Monthly grain; not joined to the daily demand panel (2010-12 to 2011-12 only, no date overlap worth a join). Dwell/vessel columns are NULL before 2009-01. Source attribution inferred from column names, not independently re-verified (dataset_registry.yaml). |
| `geopolitical_event_synthetic.csv` | `geopolitical_event_synthetic` | NOT_LOADED | A NEW table, not in the original proposal. Never mixed with disruption_event (AUTHORED) or weather_event_noaa (REAL). is_named_real_event flags the 3 rows anchored to a real event name/date (COVID Supply Shock, Russia-Ukraine War, Red Sea Crisis); their numeric fields are still unsourced. |
| `trade_route_synthetic.csv` | `trade_route_synthetic` | NOT_LOADED | A NEW table, not in the original proposal. No FK to route (route_id values are the bundle's own R00001-style ids, unrelated to this project's SHA-ROT-SUEZ-style route_id). |
| `commodity_market_synthetic.csv` | `commodity_market_synthetic` | NOT_LOADED | A NEW table, not in the original proposal. |
| `country_metadata_synthetic.csv` | `country_metadata_synthetic` | NOT_LOADED | A NEW table, not in the original proposal. iso3 values are real; every other attribute is fabricated. Deliberately NOT foreign-keyed to or merged with country.csv, so a real ISO-3 code is never used to imply these rows' attributes are that country's real statistics. |

Three cross-cutting corrections to the proposal: (a) `tariff_rate_pct` must be `DOUBLE`, because the proposal's `DECIMAL(7,3)` would round the World Bank values, which this layer promises not to do; (b) the provenance `CHECK` must allow `AUTHORED`; (c) no column may be called `capacity_per_week`, because the source has no time basis.

### Column mapping

**`country.csv` -> `country`** (key: iso3)

| Column | HANA type | Key | Null % | Provenance |
|---|---|---|---|---|
| iso3 | NVARCHAR(8) | PK | 0.0 | REAL |
| iso2 | NVARCHAR(8) |  | 81.567 | AUTHORED |
| name | NVARCHAR(64) |  | 0.0 | REAL |
| region | NVARCHAR(64) |  | 0.0 | REAL |
| income_group | NVARCHAR(64) |  | 0.0 | REAL |
| retail_label | NVARCHAR(64) |  | 83.41 | AUTHORED |
| provenance | NVARCHAR(8) |  | 0.0 | REAL |

**`port.csv` -> `port`** (key: port_id)

| Column | HANA type | Key | Null % | Provenance |
|---|---|---|---|---|
| port_id | INTEGER | PK | 0.0 | REAL |
| port_name | NVARCHAR(128) |  | 0.0 | REAL |
| country_iso2 | NVARCHAR(8) |  | 0.0 | REAL |
| country_iso3 | NVARCHAR(8) |  | 34.315 | DERIVED |
| latitude | DOUBLE |  | 0.0 | REAL |
| longitude | DOUBLE |  | 0.0 | REAL |
| harbor_size | NVARCHAR(8) |  | 0.136 | REAL |
| harbor_type | NVARCHAR(8) |  | 0.191 | REAL |
| source | NVARCHAR(128) |  | 0.0 | REAL |
| provenance | NVARCHAR(8) |  | 0.0 | REAL |

**`product.csv` -> `product`** (key: product_id)

| Column | HANA type | Key | Null % | Provenance |
|---|---|---|---|---|
| product_id | NVARCHAR(32) | PK | 0.0 | REAL |
| product_name | NVARCHAR(128) |  | 0.0 | REAL |
| avg_unit_price_gbp | DOUBLE |  | 0.132 | DERIVED |
| abc_class | NVARCHAR(8) |  | 0.0 | DERIVED |
| net_units | INTEGER |  | 0.0 | DERIVED |
| net_revenue_gbp | DOUBLE |  | 0.0 | DERIVED |
| active_days | INTEGER |  | 0.0 | DERIVED |
| first_sale_date | DATE |  | 0.132 | DERIVED |
| last_sale_date | DATE |  | 0.132 | DERIVED |
| is_forecast_series | BOOLEAN |  | 0.0 | DERIVED |
| provenance | NVARCHAR(8) |  | 0.0 | REAL |

**`warehouse.csv` -> `warehouse`** (key: warehouse_id)

| Column | HANA type | Key | Null % | Provenance |
|---|---|---|---|---|
| warehouse_id | NVARCHAR(16) | PK | 0.0 | SYNTHETIC |
| warehouse_name | NVARCHAR(64) |  | 0.0 | SYNTHETIC |
| city | NVARCHAR(16) |  | 0.0 | SYNTHETIC |
| country_iso3 | NVARCHAR(8) |  | 0.0 | SYNTHETIC |
| nearest_port_id | INTEGER |  | 33.333 | SYNTHETIC |
| provenance | NVARCHAR(32) |  | 0.0 | SYNTHETIC |

**`supplier.csv` -> `supplier`** (key: supplier_id)

| Column | HANA type | Key | Null % | Provenance |
|---|---|---|---|---|
| supplier_id | NVARCHAR(8) | PK | 0.0 | SYNTHETIC |
| supplier_name | NVARCHAR(64) |  | 0.0 | SYNTHETIC |
| city | NVARCHAR(32) |  | 0.0 | SYNTHETIC |
| country_iso3 | NVARCHAR(8) |  | 0.0 | SYNTHETIC |
| region | NVARCHAR(32) |  | 0.0 | SYNTHETIC |
| risk_level | NVARCHAR(16) |  | 0.0 | SYNTHETIC |
| origin_port_id | INTEGER |  | 25.0 | SYNTHETIC |
| provenance | NVARCHAR(32) |  | 0.0 | SYNTHETIC |

**`supplier_product.csv` -> `supplier_product`** (key: supplier_id, product_id)

| Column | HANA type | Key | Null % | Provenance |
|---|---|---|---|---|
| supplier_id | NVARCHAR(8) | PK | 0.0 | SYNTHETIC |
| product_id | NVARCHAR(16) | PK | 0.0 | SYNTHETIC |
| capacity | INTEGER |  | 0.0 | SYNTHETIC |
| unit_cost | DOUBLE |  | 0.0 | SYNTHETIC |
| lead_time_days | INTEGER |  | 0.0 | SYNTHETIC |
| reliability | DOUBLE |  | 0.0 | SYNTHETIC |
| provenance | NVARCHAR(32) |  | 0.0 | SYNTHETIC |

**`route.csv` -> `route`** (key: route_id)

| Column | HANA type | Key | Null % | Provenance |
|---|---|---|---|---|
| route_id | NVARCHAR(32) | PK | 0.0 | SYNTHETIC |
| origin | NVARCHAR(32) |  | 0.0 | SYNTHETIC |
| destination | NVARCHAR(32) |  | 0.0 | SYNTHETIC |
| origin_port_id | INTEGER |  | 0.0 | AUTHORED |
| destination_port_id | INTEGER |  | 0.0 | AUTHORED |
| transport_mode | NVARCHAR(8) |  | 0.0 | SYNTHETIC |
| lane_role | NVARCHAR(32) |  | 0.0 | SYNTHETIC |
| via | NVARCHAR(8) |  | 0.0 | DERIVED |
| chokepoints | NVARCHAR(128) |  | 0.0 | DERIVED |
| distance_km | DOUBLE |  | 0.0 | DERIVED |
| distance_basis | NVARCHAR(64) |  | 0.0 | SYNTHETIC |
| legacy_distance_km | DOUBLE |  | 20.0 | DERIVED |
| capacity | INTEGER |  | 0.0 | SYNTHETIC |
| transit_time_days | DOUBLE |  | 0.0 | DERIVED |
| cost_per_unit | DOUBLE |  | 0.0 | SYNTHETIC |
| route_note | NVARCHAR(512) |  | 0.0 | SYNTHETIC |
| provenance | NVARCHAR(32) |  | 0.0 | SYNTHETIC |

**`tariff.csv` -> `tariff`** (key: origin_iso3, dest_iso3, hs_section, effective_year)

| Column | HANA type | Key | Null % | Provenance |
|---|---|---|---|---|
| origin_iso3 | NVARCHAR(8) | PK | 0.0 | REAL |
| dest_iso3 | NVARCHAR(8) | PK | 0.0 | REAL |
| hs_section | NVARCHAR(8) | PK | 0.0 | REAL |
| effective_year | INTEGER | PK | 0.0 | REAL |
| tariff_rate_pct | DOUBLE |  | 0.0 | REAL |
| is_country_level_proxy | BOOLEAN |  | 0.0 | REAL |
| quality_flag | NVARCHAR(64) |  | 0.0 | REAL |
| source | NVARCHAR(256) |  | 0.0 | REAL |
| provenance | NVARCHAR(8) |  | 0.0 | REAL |

**`disruption_event.csv` -> `disruption_event`** (key: event_id)

| Column | HANA type | Key | Null % | Provenance |
|---|---|---|---|---|
| event_id | NVARCHAR(128) | PK | 0.0 | AUTHORED |
| event_type | NVARCHAR(64) |  | 0.0 | AUTHORED |
| location | NVARCHAR(128) |  | 0.0 | AUTHORED |
| start_ts | TIMESTAMP |  | 0.0 | AUTHORED |
| end_ts | TIMESTAMP |  | 25.0 | AUTHORED |
| severity | NVARCHAR(16) |  | 0.0 | AUTHORED |
| estimated_delay_days | DOUBLE |  | 25.0 | AUTHORED |
| status | NVARCHAR(32) |  | 0.0 | AUTHORED |
| source_note | NVARCHAR(512) |  | 0.0 | AUTHORED |
| verification_status | NVARCHAR(64) |  | 0.0 | AUTHORED |
| provenance | NVARCHAR(16) |  | 0.0 | AUTHORED |

**`disruption_impact.csv` -> `disruption_impact`** (key: event_id, entity_type, entity_id)

| Column | HANA type | Key | Null % | Provenance |
|---|---|---|---|---|
| event_id | NVARCHAR(64) | PK | 0.0 | AUTHORED |
| entity_type | NVARCHAR(16) | PK | 0.0 | AUTHORED |
| entity_id | NVARCHAR(32) | PK | 0.0 | AUTHORED |
| delay_days | DOUBLE |  | 0.0 | AUTHORED |
| capacity_factor | DOUBLE |  | 0.0 | AUTHORED |
| basis | NVARCHAR(256) |  | 0.0 | AUTHORED |
| provenance | NVARCHAR(16) |  | 0.0 | AUTHORED |

**`scenario.csv` -> `scenario`** (key: scenario_id)

| Column | HANA type | Key | Null % | Provenance |
|---|---|---|---|---|
| scenario_id | NVARCHAR(64) | PK | 0.0 | SYNTHETIC |
| scenario_name | NVARCHAR(128) |  | 0.0 | SYNTHETIC |
| description | NVARCHAR(512) |  | 0.0 | SYNTHETIC |
| scenario_type | NVARCHAR(32) |  | 0.0 | SYNTHETIC |
| is_modeled | BOOLEAN |  | 0.0 | SYNTHETIC |
| based_on_event_id | NVARCHAR(64) |  | 88.889 | SYNTHETIC |
| source | NVARCHAR(128) |  | 0.0 | SYNTHETIC |
| provenance | NVARCHAR(32) |  | 0.0 | SYNTHETIC |

**`scenario_state.csv` -> `scenario_state`** (key: scenario_id, entity_type, entity_id)

| Column | HANA type | Key | Null % | Provenance |
|---|---|---|---|---|
| scenario_id | NVARCHAR(64) | PK | 0.0 | SYNTHETIC |
| entity_type | NVARCHAR(16) | PK | 0.0 | SYNTHETIC |
| entity_id | NVARCHAR(32) | PK | 0.0 | SYNTHETIC |
| status | NVARCHAR(32) |  | 0.0 | SYNTHETIC |
| capacity_factor | DOUBLE |  | 0.0 | SYNTHETIC |
| basis | NVARCHAR(256) |  | 0.0 | SYNTHETIC |
| provenance | NVARCHAR(32) |  | 0.0 | SYNTHETIC |

**`scenario_param.csv` -> `scenario_param`** (key: scenario_id, param_key, qualifier)

| Column | HANA type | Key | Null % | Provenance |
|---|---|---|---|---|
| scenario_id | NVARCHAR(64) | PK | 0.0 | SYNTHETIC |
| param_key | NVARCHAR(32) | PK | 0.0 | SYNTHETIC |
| qualifier | NVARCHAR(8) | PK | 0.0 | SYNTHETIC |
| param_value | DOUBLE |  | 40.0 | SYNTHETIC |
| param_text | NVARCHAR(16) |  | 60.0 | SYNTHETIC |
| unit | NVARCHAR(64) |  | 0.0 | SYNTHETIC |
| basis | NVARCHAR(128) |  | 0.0 | SYNTHETIC |
| provenance | NVARCHAR(32) |  | 0.0 | SYNTHETIC |

**`inventory_policy.csv` -> `inventory_policy`** (key: warehouse_id)

| Column | HANA type | Key | Null % | Provenance |
|---|---|---|---|---|
| warehouse_id | NVARCHAR(16) | PK | 0.0 | SYNTHETIC |
| demand_share | DOUBLE |  | 0.0 | SYNTHETIC |
| cover_multiplier | DOUBLE |  | 0.0 | SYNTHETIC |
| safety_multiplier | DOUBLE |  | 0.0 | SYNTHETIC |
| target_days_of_cover | INTEGER |  | 0.0 | SYNTHETIC |
| safety_days | INTEGER |  | 0.0 | SYNTHETIC |
| replenish_days | INTEGER |  | 0.0 | SYNTHETIC |
| replenishment_lead_time_days | INTEGER |  | 0.0 | SYNTHETIC |
| provenance | NVARCHAR(32) |  | 0.0 | SYNTHETIC |

**`inventory.csv` -> `inventory_snapshot`** (key: warehouse_id, product_id, date)

| Column | HANA type | Key | Null % | Provenance |
|---|---|---|---|---|
| warehouse_id | NVARCHAR(16) | PK | 0.0 | SYNTHETIC |
| product_id | NVARCHAR(16) | PK | 0.0 | SYNTHETIC |
| date | DATE | PK | 0.0 | SYNTHETIC |
| opening_stock | INTEGER |  | 0.0 | SYNTHETIC |
| inbound_quantity | INTEGER |  | 0.0 | SYNTHETIC |
| outbound_quantity | INTEGER |  | 0.0 | SYNTHETIC |
| closing_stock | INTEGER |  | 0.0 | SYNTHETIC |
| safety_stock | INTEGER |  | 0.0 | SYNTHETIC |
| reorder_point | INTEGER |  | 0.0 | SYNTHETIC |
| demand_quantity | INTEGER |  | 0.0 | SYNTHETIC |
| unfilled_quantity | INTEGER |  | 0.0 | SYNTHETIC |
| stockout_flag | BOOLEAN |  | 0.0 | SYNTHETIC |
| provenance | NVARCHAR(32) |  | 0.0 | SYNTHETIC |

**`demand.csv` -> `demand_daily`** (key: date, product_id, location_id)

| Column | HANA type | Key | Null % | Provenance |
|---|---|---|---|---|
| date | DATE | PK | 0.0 | DERIVED |
| product_id | NVARCHAR(32) | PK | 0.0 | DERIVED |
| location_id | NVARCHAR(64) | PK | 0.0 | DERIVED |
| country_iso3 | NVARCHAR(8) |  | 0.0 | DERIVED |
| demand_quantity | INTEGER |  | 0.0 | DERIVED |
| n_order_lines | INTEGER |  | 0.0 | DERIVED |
| n_outlier_lines | INTEGER |  | 0.0 | DERIVED |
| provenance | NVARCHAR(16) |  | 0.0 | DERIVED |

**`demand_modeling_panel.csv` -> `ref_demand_panel`** (key: date, product_id, location_id)

| Column | HANA type | Key | Null % | Provenance |
|---|---|---|---|---|
| date | DATE | PK | 0.0 | DERIVED |
| product_id | NVARCHAR(16) | PK | 0.0 | DERIVED |
| location_id | NVARCHAR(32) | PK | 0.0 | DERIVED |
| demand_quantity | INTEGER |  | 0.0 | DERIVED |
| lag_1 | DOUBLE |  | 0.267 | DERIVED |
| lag_2 | DOUBLE |  | 0.535 | DERIVED |
| lag_7 | DOUBLE |  | 1.872 | DERIVED |
| lag_14 | DOUBLE |  | 3.743 | DERIVED |
| lag_28 | DOUBLE |  | 7.487 | DERIVED |
| rolling_mean_7 | DOUBLE |  | 0.267 | DERIVED |
| rolling_mean_14 | DOUBLE |  | 0.267 | DERIVED |
| rolling_mean_28 | DOUBLE |  | 0.267 | DERIVED |
| day_of_week | INTEGER |  | 0.0 | DERIVED |
| month | INTEGER |  | 0.0 | DERIVED |
| disruption_active | BOOLEAN |  | 0.0 | DERIVED |
| split | NVARCHAR(16) |  | 0.0 | DERIVED |
| has_outlier_line | BOOLEAN |  | 0.0 | DERIVED |
| provenance | NVARCHAR(16) |  | 0.0 | DERIVED |

**`sales_order_line.csv` -> `sales_order_line`** (key: order_id, line_no)

| Column | HANA type | Key | Null % | Provenance |
|---|---|---|---|---|
| order_id | NVARCHAR(16) | PK | 0.0 | REAL |
| line_no | INTEGER | PK | 0.0 | REAL |
| source_row | INTEGER |  | 0.0 | REAL |
| product_id | NVARCHAR(32) |  | 0.0 | REAL |
| quantity_gross | INTEGER |  | 0.0 | REAL |
| quantity_cancelled | INTEGER |  | 0.0 | DERIVED |
| quantity_net | INTEGER |  | 0.0 | DERIVED |
| unit_price_gbp | DOUBLE |  | 0.0 | REAL |
| order_ts | TIMESTAMP |  | 0.0 | REAL |
| customer_id | DOUBLE |  | 25.13 | REAL |
| location_id | NVARCHAR(64) |  | 0.0 | REAL |
| country_iso3 | NVARCHAR(8) |  | 0.0 | DERIVED |
| is_quantity_outlier | BOOLEAN |  | 0.0 | DERIVED |
| provenance | NVARCHAR(8) |  | 0.0 | REAL |

**`tariff_latest.csv` -> `tariff_latest`** (key: origin_iso3)

| Column | HANA type | Key | Null % | Provenance |
|---|---|---|---|---|
| origin_iso3 | NVARCHAR(8) | PK | 0.0 | REAL |
| country_name | NVARCHAR(64) |  | 0.0 | REAL |
| latest_year | INTEGER |  | 13.364 | REAL |
| tariff_rate_pct | DOUBLE |  | 13.364 | REAL |
| reference_year | INTEGER |  | 0.0 | DERIVED |
| staleness_years | INTEGER |  | 13.364 | DERIVED |
| data_status | NVARCHAR(16) |  | 0.0 | DERIVED |
| quality_flag | NVARCHAR(32) |  | 13.364 | REAL |
| source | NVARCHAR(256) |  | 0.0 | REAL |
| provenance | NVARCHAR(8) |  | 0.0 | REAL |

**`weather_event_noaa.csv` -> `weather_event`** (key: event_id)

| Column | HANA type | Key | Null % | Provenance |
|---|---|---|---|---|
| event_id | NVARCHAR(32) | PK | 0.0 | REAL |
| event_type | NVARCHAR(64) |  | 0.0 | REAL |
| state | NVARCHAR(64) |  | 0.0 | DERIVED |
| location | NVARCHAR(64) |  | 0.0 | DERIVED |
| start_ts | TIMESTAMP |  | 0.0 | REAL |
| end_ts | TIMESTAMP |  | 0.0 | REAL |
| severity | NVARCHAR(16) |  | 0.0 | DERIVED |
| damage_property_usd | DOUBLE |  | 0.0 | DERIVED |
| damage_crops_usd | DOUBLE |  | 0.0 | DERIVED |
| casualties | INTEGER |  | 0.0 | DERIVED |
| begin_lat | DOUBLE |  | 39.557 | REAL |
| begin_lon | DOUBLE |  | 39.557 | REAL |
| magnitude | DOUBLE |  | 47.756 | REAL |
| magnitude_type | NVARCHAR(8) |  | 60.597 | REAL |
| source | NVARCHAR(128) |  | 0.0 | REAL |
| provenance | NVARCHAR(8) |  | 0.0 | REAL |

**`ntm_prevalence_sector.csv` -> `ntm_prevalence_sector`** (key: reporter_iso3, sector, ntm_type_count_bucket)

| Column | HANA type | Key | Null % | Provenance |
|---|---|---|---|---|
| reporter_iso3 | NVARCHAR(8) | PK | 0.0 | REAL |
| sector | NVARCHAR(64) | PK | 0.0 | REAL |
| ntm_type_count_bucket | NVARCHAR(16) | PK | 0.0 | REAL |
| share_pct | DOUBLE |  | 0.0 | REAL |
| affected_product_count | INTEGER |  | 0.0 | REAL |
| source | NVARCHAR(512) |  | 0.0 | REAL |
| provenance | NVARCHAR(8) |  | 0.0 | REAL |

**`supply_chain_pressure_index.csv` -> `supply_chain_pressure_index`** (key: date)

| Column | HANA type | Key | Null % | Provenance |
|---|---|---|---|---|
| date | DATE | PK | 0.0 | REAL |
| cpi_us | DOUBLE |  | 0.0 | REAL |
| cpi_goods | DOUBLE |  | 0.0 | REAL |
| cpi_services | DOUBLE |  | 0.0 | REAL |
| indpro | DOUBLE |  | 0.0 | REAL |
| oil_price | DOUBLE |  | 1.01 | REAL |
| gscpi | DOUBLE |  | 0.0 | REAL |
| cpi_yoy | DOUBLE |  | 0.0 | REAL |
| cpi_goods_yoy | DOUBLE |  | 0.0 | REAL |
| cpi_services_yoy | DOUBLE |  | 0.0 | REAL |
| indpro_yoy | DOUBLE |  | 0.0 | REAL |
| oil_yoy | DOUBLE |  | 1.01 | REAL |
| dwell_composite | DOUBLE |  | 32.323 | REAL |
| dwell_la_raw | DOUBLE |  | 32.323 | REAL |
| la_unique_vessels | DOUBLE |  | 32.323 | REAL |
| dwell_la_detrended | DOUBLE |  | 32.323 | REAL |
| source | NVARCHAR(512) |  | 0.0 | REAL |
| provenance | NVARCHAR(8) |  | 0.0 | REAL |

**`geopolitical_event_synthetic.csv` -> `geopolitical_event_synthetic`** (key: event_id)

| Column | HANA type | Key | Null % | Provenance |
|---|---|---|---|---|
| event_id | NVARCHAR(16) | PK | 0.0 | SYNTHETIC |
| event_date | DATE |  | 0.0 | SYNTHETIC |
| event_type | NVARCHAR(64) |  | 0.0 | SYNTHETIC |
| severity | INTEGER |  | 0.0 | SYNTHETIC |
| affected_region | NVARCHAR(32) |  | 0.0 | SYNTHETIC |
| duration_days | INTEGER |  | 0.0 | SYNTHETIC |
| risk_increase | DOUBLE |  | 0.0 | SYNTHETIC |
| is_named_real_event | BOOLEAN |  | 0.0 | SYNTHETIC |
| source | NVARCHAR(256) |  | 0.0 | SYNTHETIC |
| provenance | NVARCHAR(32) |  | 0.0 | SYNTHETIC |

**`trade_route_synthetic.csv` -> `trade_route_synthetic`** (key: week_date, route_id)

| Column | HANA type | Key | Null % | Provenance |
|---|---|---|---|---|
| week_date | DATE | PK | 0.0 | SYNTHETIC |
| route_id | NVARCHAR(16) | PK | 0.0 | SYNTHETIC |
| trade_volume_tonnes | DOUBLE |  | 0.0 | SYNTHETIC |
| shipping_delay_days | DOUBLE |  | 0.0 | SYNTHETIC |
| freight_cost_usd | DOUBLE |  | 0.0 | SYNTHETIC |
| container_availability_index | DOUBLE |  | 0.0 | SYNTHETIC |
| port_congestion_index | DOUBLE |  | 0.0 | SYNTHETIC |
| fuel_cost_index | DOUBLE |  | 0.0 | SYNTHETIC |
| commodity_price_index | DOUBLE |  | 0.0 | SYNTHETIC |
| weather_disruption_score | DOUBLE |  | 0.0 | SYNTHETIC |
| geopolitical_risk_score | DOUBLE |  | 0.0 | SYNTHETIC |
| route_status | NVARCHAR(32) |  | 0.0 | SYNTHETIC |
| carbon_emissions_tonnes | DOUBLE |  | 0.0 | SYNTHETIC |
| origin_country | NVARCHAR(32) |  | 0.0 | SYNTHETIC |
| destination_country | NVARCHAR(32) |  | 0.0 | SYNTHETIC |
| distance_km | INTEGER |  | 0.0 | SYNTHETIC |
| shipping_method | NVARCHAR(8) |  | 0.0 | SYNTHETIC |
| trade_route_type | NVARCHAR(32) |  | 0.0 | SYNTHETIC |
| estimated_transit_days | INTEGER |  | 0.0 | SYNTHETIC |
| Route_Risk_Score | DOUBLE |  | 0.0 | SYNTHETIC |
| source | NVARCHAR(256) |  | 0.0 | SYNTHETIC |
| provenance | NVARCHAR(32) |  | 0.0 | SYNTHETIC |

**`commodity_market_synthetic.csv` -> `commodity_market_synthetic`** (key: week_date)

| Column | HANA type | Key | Null % | Provenance |
|---|---|---|---|---|
| week_date | DATE | PK | 0.0 | SYNTHETIC |
| oil_price | DOUBLE |  | 0.0 | SYNTHETIC |
| natural_gas_price | DOUBLE |  | 0.0 | SYNTHETIC |
| steel_price | DOUBLE |  | 0.0 | SYNTHETIC |
| wheat_price | DOUBLE |  | 0.0 | SYNTHETIC |
| copper_price | DOUBLE |  | 0.0 | SYNTHETIC |
| commodity_stress_index | DOUBLE |  | 0.0 | SYNTHETIC |
| source | NVARCHAR(256) |  | 0.0 | SYNTHETIC |
| provenance | NVARCHAR(32) |  | 0.0 | SYNTHETIC |

**`country_metadata_synthetic.csv` -> `country_metadata_synthetic`** (key: iso3)

| Column | HANA type | Key | Null % | Provenance |
|---|---|---|---|---|
| country_name | NVARCHAR(32) |  | 0.0 | SYNTHETIC |
| iso3 | NVARCHAR(8) | PK | 0.0 | SYNTHETIC |
| region | NVARCHAR(64) |  | 0.0 | SYNTHETIC |
| income_group | NVARCHAR(64) |  | 0.0 | SYNTHETIC |
| population | INTEGER |  | 0.0 | SYNTHETIC |
| gdp_per_capita | INTEGER |  | 0.0 | SYNTHETIC |
| trade_dependency_score | DOUBLE |  | 0.0 | SYNTHETIC |
| port_capacity_index | DOUBLE |  | 0.0 | SYNTHETIC |
| logistics_performance_index | DOUBLE |  | 0.0 | SYNTHETIC |
| source | NVARCHAR(256) |  | 0.0 | SYNTHETIC |
| provenance | NVARCHAR(32) |  | 0.0 | SYNTHETIC |

### How to load

* **Order** (parents before children): `country` -> `port` -> `product` -> `warehouse` -> `supplier` -> `supplier_product` -> `route` -> `tariff` -> `disruption_event` -> `disruption_impact` -> `scenario` -> `scenario_state` -> `scenario_param` -> `inventory_policy` -> `inventory` -> `demand` -> `demand_modeling_panel` -> `sales_order_line` -> `tariff_latest`.
* **Dates** are `YYYY-MM-DD`, timestamps `YYYY-MM-DD HH:MM:SS` (no time zone; the sources give none). **Booleans** are `True` / `False`. **NULL** is an empty field; a key column is never empty.
* **Identifiers are text**, including ones that look numeric (`22197`): read them as `NVARCHAR`, never as integers. `port_id`, `line_no` and `customer_id` are integers.
* **Encoding** is UTF-8, `\n` line endings, standard CSV quoting. Nothing is rounded: floats are written at full precision.
* **Untested against HANA.** No tenant was available: the types and CSV conventions above are recommendations from the data, not something a HANA import has accepted. If the importer is case-sensitive about booleans, write `1` / `0`.
* `data_dictionary.csv`, `manifest.json` and this report are metadata, not data to load.

## 9. Ready to load into SAP HANA Cloud

**Ready (CORE):** `country.csv`, `port.csv`, `product.csv`, `warehouse.csv`, `supplier.csv`, `supplier_product.csv`, `route.csv`, `tariff.csv`, `disruption_event.csv`, `disruption_impact.csv`, `scenario.csv`, `scenario_state.csv`, `scenario_param.csv`, `inventory_policy.csv`, `inventory.csv`, `demand.csv`, `demand_modeling_panel.csv`

**Ready but optional:** `sales_order_line.csv` (every priced sale line of the workbook with gross, cancelled and net quantity: the lineage behind demand); `tariff_latest.csv` (one row per country: latest value, how stale it is, or NO_DATA)

**Clean, but recommended to stay in the file layer:** `weather_event_noaa.csv`; `ntm_prevalence_sector.csv`; `supply_chain_pressure_index.csv`; `geopolitical_event_synthetic.csv`; `trade_route_synthetic.csv`; `commodity_market_synthetic.csv`; `country_metadata_synthetic.csv`

**Not ready, because they are not data to load:** `data_dictionary.csv`, `manifest.json`, `DATA_READINESS_REPORT.md`, and everything in `data/interim/`.

**Still true of every file above:** it is ready in the sense of section 1. Before anything is loaded the HANA tables must be created from the mapping in section 8, which has not been done.

## 10. Reproducing this

```
python -m backend.services.preprocessing.cleaned.build      # from the repository root; about a minute
python -m pytest backend/tests/test_cleaned_layer.py         # the same checks, on the files as they sit on disk
```

Integrity checks run in this build:

| Check | Result | Detail |
|---|---|---|
| country: key ['iso3'] has no nulls | pass | 0 null-key rows |
| country: key ['iso3'] is unique | pass | 0 repeated keys in 217 rows |
| country: every row has a valid provenance | pass | invalid: [] |
| port: key ['port_id'] has no nulls | pass | 0 null-key rows |
| port: key ['port_id'] is unique | pass | 0 repeated keys in 3,669 rows |
| port: every row has a valid provenance | pass | invalid: [] |
| port.country_iso3 -> country.iso3 resolves | pass | 0 orphan rows |
| product: key ['product_id'] has no nulls | pass | 0 null-key rows |
| product: key ['product_id'] is unique | pass | 0 repeated keys in 3,798 rows |
| product: every row has a valid provenance | pass | invalid: [] |
| supplier: key ['supplier_id'] has no nulls | pass | 0 null-key rows |
| supplier: key ['supplier_id'] is unique | pass | 0 repeated keys in 8 rows |
| supplier: every row has a valid provenance | pass | invalid: [] |
| supplier.country_iso3 -> country.iso3 resolves | pass | 0 orphan rows |
| supplier.origin_port_id -> port.port_id resolves | pass | 0 orphan rows |
| supplier_product: key ['supplier_id', 'product_id'] has no nulls | pass | 0 null-key rows |
| supplier_product: key ['supplier_id', 'product_id'] is unique | pass | 0 repeated keys in 14 rows |
| supplier_product: every row has a valid provenance | pass | invalid: [] |
| supplier_product.supplier_id -> supplier.supplier_id resolves | pass | 0 orphan rows |
| supplier_product.product_id -> product.product_id resolves | pass | 0 orphan rows |
| warehouse: key ['warehouse_id'] has no nulls | pass | 0 null-key rows |
| warehouse: key ['warehouse_id'] is unique | pass | 0 repeated keys in 3 rows |
| warehouse: every row has a valid provenance | pass | invalid: [] |
| warehouse.country_iso3 -> country.iso3 resolves | pass | 0 orphan rows |
| warehouse.nearest_port_id -> port.port_id resolves | pass | 0 orphan rows |
| route: key ['route_id'] has no nulls | pass | 0 null-key rows |
| route: key ['route_id'] is unique | pass | 0 repeated keys in 10 rows |
| route: every row has a valid provenance | pass | invalid: [] |
| route.origin_port_id -> port.port_id resolves | pass | 0 orphan rows |
| route.destination_port_id -> port.port_id resolves | pass | 0 orphan rows |
| sales_order_line: key ['order_id', 'line_no'] has no nulls | pass | 0 null-key rows |
| sales_order_line: key ['order_id', 'line_no'] is unique | pass | 0 repeated keys in 522,038 rows |
| sales_order_line: every row has a valid provenance | pass | invalid: [] |
| sales_order_line.product_id -> product.product_id resolves | pass | 0 orphan rows |
| sales_order_line.country_iso3 -> country.iso3 resolves | pass | 0 orphan rows |
| demand: key ['date', 'product_id', 'location_id'] has no nulls | pass | 0 null-key rows |
| demand: key ['date', 'product_id', 'location_id'] is unique | pass | 0 repeated keys in 300,837 rows |
| demand: every row has a valid provenance | pass | invalid: [] |
| demand.product_id -> product.product_id resolves | pass | 0 orphan rows |
| demand.country_iso3 -> country.iso3 resolves | pass | 0 orphan rows |
| demand_modeling_panel: key ['date', 'product_id', 'location_id'] has no nulls | pass | 0 null-key rows |
| demand_modeling_panel: key ['date', 'product_id', 'location_id'] is unique | pass | 0 repeated keys in 14,960 rows |
| demand_modeling_panel: every row has a valid provenance | pass | invalid: [] |
| demand_modeling_panel.product_id -> product.product_id resolves | pass | 0 orphan rows |
| inventory: key ['warehouse_id', 'product_id', 'date'] has no nulls | pass | 0 null-key rows |
| inventory: key ['warehouse_id', 'product_id', 'date'] is unique | pass | 0 repeated keys in 44,880 rows |
| inventory: every row has a valid provenance | pass | invalid: [] |
| inventory.warehouse_id -> warehouse.warehouse_id resolves | pass | 0 orphan rows |
| inventory.product_id -> product.product_id resolves | pass | 0 orphan rows |
| inventory_policy: key ['warehouse_id'] has no nulls | pass | 0 null-key rows |
| inventory_policy: key ['warehouse_id'] is unique | pass | 0 repeated keys in 3 rows |
| inventory_policy: every row has a valid provenance | pass | invalid: [] |
| inventory_policy.warehouse_id -> warehouse.warehouse_id resolves | pass | 0 orphan rows |
| tariff: key ['origin_iso3', 'dest_iso3', 'hs_section', 'effective_year'] has no nulls | pass | 0 null-key rows |
| tariff: key ['origin_iso3', 'dest_iso3', 'hs_section', 'effective_year'] is unique | pass | 0 repeated keys in 3,771 rows |
| tariff: every row has a valid provenance | pass | invalid: [] |
| tariff.origin_iso3 -> country.iso3 resolves | pass | 0 orphan rows |
| tariff_latest: key ['origin_iso3'] has no nulls | pass | 0 null-key rows |
| tariff_latest: key ['origin_iso3'] is unique | pass | 0 repeated keys in 217 rows |
| tariff_latest: every row has a valid provenance | pass | invalid: [] |
| tariff_latest.origin_iso3 -> country.iso3 resolves | pass | 0 orphan rows |
| weather_event_noaa: key ['event_id'] has no nulls | pass | 0 null-key rows |
| weather_event_noaa: key ['event_id'] is unique | pass | 0 repeated keys in 69,801 rows |
| weather_event_noaa: every row has a valid provenance | pass | invalid: [] |
| disruption_event: key ['event_id'] has no nulls | pass | 0 null-key rows |
| disruption_event: key ['event_id'] is unique | pass | 0 repeated keys in 4 rows |
| disruption_event: every row has a valid provenance | pass | invalid: [] |
| disruption_impact: key ['event_id', 'entity_type', 'entity_id'] has no nulls | pass | 0 null-key rows |
| disruption_impact: key ['event_id', 'entity_type', 'entity_id'] is unique | pass | 0 repeated keys in 4 rows |
| disruption_impact: every row has a valid provenance | pass | invalid: [] |
| disruption_impact.event_id -> disruption_event.event_id resolves | pass | 0 orphan rows |
| scenario: key ['scenario_id'] has no nulls | pass | 0 null-key rows |
| scenario: key ['scenario_id'] is unique | pass | 0 repeated keys in 9 rows |
| scenario: every row has a valid provenance | pass | invalid: [] |
| scenario.based_on_event_id -> disruption_event.event_id resolves | pass | 0 orphan rows |
| scenario_state: key ['scenario_id', 'entity_type', 'entity_id'] has no nulls | pass | 0 null-key rows |
| scenario_state: key ['scenario_id', 'entity_type', 'entity_id'] is unique | pass | 0 repeated keys in 13 rows |
| scenario_state: every row has a valid provenance | pass | invalid: [] |
| scenario_state.scenario_id -> scenario.scenario_id resolves | pass | 0 orphan rows |
| scenario_param: key ['scenario_id', 'param_key', 'qualifier'] has no nulls | pass | 0 null-key rows |
| scenario_param: key ['scenario_id', 'param_key', 'qualifier'] is unique | pass | 0 repeated keys in 10 rows |
| scenario_param: every row has a valid provenance | pass | invalid: [] |
| scenario_param.scenario_id -> scenario.scenario_id resolves | pass | 0 orphan rows |
| ntm_prevalence_sector: key ['reporter_iso3', 'sector', 'ntm_type_count_bucket'] has no nulls | pass | 0 null-key rows |
| ntm_prevalence_sector: key ['reporter_iso3', 'sector', 'ntm_type_count_bucket'] is unique | pass | 0 repeated keys in 3,943 rows |
| ntm_prevalence_sector: every row has a valid provenance | pass | invalid: [] |
| supply_chain_pressure_index: key ['date'] has no nulls | pass | 0 null-key rows |
| supply_chain_pressure_index: key ['date'] is unique | pass | 0 repeated keys in 297 rows |
| supply_chain_pressure_index: every row has a valid provenance | pass | invalid: [] |
| geopolitical_event_synthetic: key ['event_id'] has no nulls | pass | 0 null-key rows |
| geopolitical_event_synthetic: key ['event_id'] is unique | pass | 0 repeated keys in 10,003 rows |
| geopolitical_event_synthetic: every row has a valid provenance | pass | invalid: [] |
| trade_route_synthetic: key ['week_date', 'route_id'] has no nulls | pass | 0 null-key rows |
| trade_route_synthetic: key ['week_date', 'route_id'] is unique | pass | 0 repeated keys in 31,300 rows |
| trade_route_synthetic: every row has a valid provenance | pass | invalid: [] |
| commodity_market_synthetic: key ['week_date'] has no nulls | pass | 0 null-key rows |
| commodity_market_synthetic: key ['week_date'] is unique | pass | 0 repeated keys in 626 rows |
| commodity_market_synthetic: every row has a valid provenance | pass | invalid: [] |
| country_metadata_synthetic: key ['iso3'] has no nulls | pass | 0 null-key rows |
| country_metadata_synthetic: key ['iso3'] is unique | pass | 0 repeated keys in 10 rows |
| country_metadata_synthetic: every row has a valid provenance | pass | invalid: [] |
| demand: gross - cancelled = net on every sale line, and net is never negative | pass |  |
| demand: total net units on sale lines = total units in demand.csv | pass | 5,308,637 vs 5,308,637 |
| demand: the two known cancelled orders (74,215 and 80,995 units) contribute nothing | pass | largest daily demand is 4,848 |
| demand: no non-positive demand rows | pass |  |
| demand: every sale line is a priced sale | pass |  |
| panel: each series' total equals its total in demand.csv (densifying only adds zero days) | pass | 766,802 vs 766,802 |
| panel: dense calendar (every series has every day) | pass | 374 days |
| panel: 40 series | pass | 40 series |
| inventory: (warehouse_id, product_id, date) is unique AND the grid is complete | pass | 44,880 rows, grid 44,880 |
| inventory: closing = opening + inbound - outbound exactly, with no clipping | pass |  |
| inventory: stock and flows are never negative | pass |  |
| inventory: each day opens with the previous day's closing stock | pass |  |
| inventory: outbound + unfilled = demand, and stockout_flag = (unfilled > 0) | pass |  |
| inventory: the warehouses' demand sums to the panel's demand on every product-day (no unit lost or invented) | pass |  |
| inventory: only products of the modeling panel | pass |  |
| suppliers: no disruption state in the master tables | pass | state columns found: [] |
| suppliers: supplier_id alone repeats in supplier_product (so the pair is the key), and is unique in supplier | pass |  |
| suppliers: every supplier is named SYNTHETIC | pass |  |
| suppliers: every supplier carries a product and every product has at least two suppliers | pass |  |
| suppliers: nominal capacity is positive for every pair (a disruption is not baked in) | pass |  |
| suppliers: supplier products are products of the modeling panel and of the inventory ledger | pass |  |
| scenarios: BASELINE_NORMAL exists and changes nothing (no state rows: every supplier ACTIVE, every lane NORMAL) | pass |  |
| scenarios: the old demo start (S001 DISRUPTED, S002 REDUCED) is kept as a scenario | pass | {'S001': 'DISRUPTED', 'S002': 'REDUCED'} |
| scenarios: every scenario of scenarios.yaml is present | pass | missing [] |
| scenarios: every scenario_state entity is a real route or supplier | pass | 0 unknown entities |
| scenarios: every historical impact names a real route | pass |  |
| scenarios: scenario_param keys are unique per scenario and qualifier | pass |  |
| routes: each of the four origins has both a SUEZ and a CAPE lane | pass | {'CHE': True, 'MUM': True, 'SHA': True, 'SIN': True} |
| routes: the Cape lane is longer than the Suez lane for every origin | pass | {'CHE': 1.52, 'MUM': 1.73, 'SHA': 1.37, 'SIN': 1.47} |
| routes: every Phase 3 route id is kept | pass |  |
| routes: the lanes scenarios.yaml says a Suez closure blocks are exactly the lanes through the canal | pass | ['CHE-ROT-SUEZ', 'MUM-ROT-SUEZ', 'SHA-ROT-SUEZ', 'SIN-ROT-SUEZ'] vs ['CHE-ROT-SUEZ', 'MUM-ROT-SUEZ', 'SHA-ROT-SUEZ', 'SIN-ROT-SUEZ'] |
| tariffs: every value equals the World Bank file, none added, filled or rounded | pass | 3,771 observations |
| tariffs: every country is CURRENT, STALE or NO_DATA | pass |  |
| events: NOAA rows are all REAL and never mixed with AUTHORED events | pass |  |
| provenance: everything invented is SYNTHETIC | pass |  |
| provenance: the real sources are REAL | pass |  |
