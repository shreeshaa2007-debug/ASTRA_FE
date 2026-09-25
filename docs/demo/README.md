# Demo screenshots

The backup slides for [demo-script.md](../demo-script.md): if the live demo fails, walk these in order. They are
real screenshots of a real run (`python scripts/demo.py --fresh`, then `node scripts/capture_demo.mjs --llm`),
not mock-ups. Regenerate them any time — the capture script raises the moment a step of the demo no longer works,
so it doubles as a check that the demo path still exists.

| # | File | What it shows | Script step |
|---|---|---|---|
| 1 | `01-dashboard.png` | Command center after a finished Suez run: KPIs, four disrupted lanes on the map, exposure | 0:00 |
| 2 | `02-scenarios-suez.png` | Normal operations vs. doing nothing vs. the optimized response, for the Suez closure | (extra) |
| 3 | `03-scenarios-supplier-failure.png` | Losing the main supplier: 3,759 units secured for +361,744 cost units (+94%) | 0:45 |
| 4 | `04-scenarios-not-modeled.png` | A scenario the model cannot represent says so instead of inventing a number | 1:45 |
| 5 | `05-simulator-awaiting-approval.png` | The five agents ran; the plan is escalated over the 500,000 threshold | 2:15 |
| 6 | `06-decision-center.png` | Why this plan: the choice, the objective, the constraints, the three-way comparison | 3:00 |
| 7 | `07-compliance-pending.png` | Four deterministic policy checks; the cost check escalates to a named human | 4:00 |
| 8 | `08-compliance-approved.png` | The human decision, named and recorded | 4:00 |
| 9 | `09-dashboard-after.png` | The dashboard now follows the newly finalized plan | 4:30 |
| 10 | `10-inventory.png` | Per-warehouse stock, days of cover, demand forecast (for questions) | (extra) |
| 11 | `11-sourcing.png` | Suppliers, status overlay, tariffs, recommended mix (for questions) | (extra) |
| 12 | `12-logistics.png` | Route network, volume per route, proposed shipments (for questions) | (extra) |
| 13 | `13-agent-monitor.png` | Every stage, the audit trail, and the Operations panel: metrics, model drift, readiness | 4:45 |
| 14 | `14-simulator-free-text.png` | A free-text report read by the real Gemini, validated, then planned (needs the network) | 5:30 |

The numbers are for product 22197 on this repository's data.
