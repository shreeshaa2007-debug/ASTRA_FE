# ResilientSC — Model Plan (Phase 1)

Scope: the demand-forecasting model that feeds the Inventory Agent. This is the
only ML model in the system — optimization is solved, not learned (see
architecture.md §3), and compliance is deterministic rules (see agent-plan.md),
per the brief's own instruction not to add models where a simpler mechanism is
correct.

## 1. Baselines before XGBoost (mandatory per the brief — XGBoost has to earn it)

| Model | Why it's in the baseline set |
|---|---|
| Naive (last value carried forward) | The floor — any model that can't beat this shouldn't ship |
| Seasonal naive (same period last cycle) | Demand data is seasonal (weekly/monthly); this is usually a stronger floor than plain naive |
| Moving average (rolling window) | Cheap smoothing baseline |
| Exponential smoothing (Holt-Winters if trend+seasonality both present) | Classical baseline that often competes with gradient boosting on short, clean series — if it wins on some product/location segments, that's a real finding, not a failure |

XGBoost is only adopted for the segments where it actually beats these on
held-out data, per-segment, not as a blanket global claim. This is the
"do not blindly assume XGBoost is optimal" instruction taken literally.

## 2. Features

- Lags: `lag_1, lag_2, lag_7, lag_14, lag_28`
- Rolling stats: `rolling_mean_7, rolling_mean_14, rolling_mean_28` (computed
  strictly on past data relative to each row — see leakage note below)
- Calendar: `day_of_week, month`, plus seasonality indicators derived from the
  chosen dataset's own event/holiday columns where available (M5 ships these
  natively — see data-plan.md)
- Disruption-aware features: a binary/severity flag per row indicating whether an
  active disruption (from `DISRUPTIONS`) affects that product/location on that
  date, plus days-since-disruption-start — this is what lets the model behave
  differently during a Suez-closure-shaped shock instead of smoothing through it

## 3. Splitting and leakage — time-based only

Random k-fold is explicitly disallowed by the brief for time series and would be
wrong regardless: train on the earliest window, validate on the next, test on the
most recent, in that order, no shuffling. Rolling-window lag/mean features are
computed with an as-of cutoff so no row's features are built from data that would
not have existed at prediction time. Both checks (time-ordering, no-leakage) get
an explicit unit test in Phase 5 — see §21 of the brief and `backend/tests/`.

## 4. Evaluation

- **Metrics**: MAE, RMSE, MAPE, WAPE (WAPE specifically because it's the one
  robust to the near-zero-demand rows that show up during a disruption).
- **Disruption-period slice**: metrics computed once on the full test window and
  again restricted to rows flagged by a historical disruption — the brief
  explicitly wants shock-period performance reported separately, since a model
  can look fine on average while being exactly wrong when it matters (during the
  event the Inventory Agent actually needs to react to).
- Every metric, on every segment, goes into the model card saved alongside the
  artifact (§5).

## 5. Artifacts and versioning

Saved together per trained model, per §7/§24 of the brief:

```
ml/artifacts/<model_name>/<version>/
  model.json            # XGBoost booster
  preprocessing.pkl      # fitted transformers (encoders, scalers if any)
  feature_list.json      # exact column order the model expects
  metrics.json            # global + disruption-period MAE/RMSE/MAPE/WAPE
  metadata.json             # model_name, model_version, training_dataset_version,
                             #   training_date, git_commit
```

The model is trained offline (`ml/training/`), never at backend startup (§25) —
the API loads the latest registered artifact, or a pinned version, at process
start.

## 6. Serving contract

```
POST /api/forecast
{ "product_id": "...", "location_id": "...", "forecast_horizon": 14,
  "recent_demand": [...] }

→ { "predicted_demand": [...], "confidence": {...} | "risk": "LOW|MEDIUM|HIGH",
    "model_version": "xgboost-2026.09-1" }
```

Full endpoint contract lives in [api-plan.md](api-plan.md); this section exists
so the model and API teams agree on the payload before either is built.

## 7. Explainability (§27)

XGBoost feature importance (gain-based) is computed once per training run and
stored in `metrics.json`. The Inventory Agent's output includes a short
natural-language reason string built from the top contributing features for that
specific prediction (e.g., "driven by a 7-day upward trend and the active
disruption flag"), not a SHAP dump — matches the brief's "concise explanation,
not chain-of-thought" instruction.

## 8. Monitoring (§26, lightweight per the brief) — as built in Phase 19

Implemented in `backend/monitoring/model_monitor.py` and served by `GET /api/monitoring/model`; the five signals
below are all tracked. One deviation from the sketch: they go to the structured log and an in-process registry, not to
files under `backend/monitoring/` (a source directory is the wrong place for runtime output). `prediction_error` comes
from `backtest()`: forecast the last N days of known history from before them and score it (WAPE, MAE) — on this data
the last 14 days score a WAPE of ~77% for the top product, which the drift warning (recent demand far above anything in
training) predicted.

Tracked per inference call, logged to `backend/monitoring/`:
`prediction_error` (once actuals are known), `missing_feature_rate`,
`model_version`, `inference_count`, `inference_latency_ms`. A simple drift
warning: flag when the rolling distribution of a key input feature (e.g.
`lag_7`) moves beyond N standard deviations of its training-time distribution —
this is a threshold check, not a full drift-detection library, matching "if
practical, add a simple drift warning" rather than over-building.

## 9. Where this sits in the SAP production picture

SAP HANA Cloud's Predictive Analysis Library ships 90+ algorithms including
gradient-boosted trees and Prophet-style additive time-series models, running
in-database. That's a legitimate production alternative to a served XGBoost
model — documented in architecture.md §2 as an "or" alongside SAP AI Core hosting
this exact model, not silently assumed. Which one a real deployment picks is a
data-gravity decision (in-database vs. served endpoint) outside this hackathon's
scope; both are named so the choice isn't hidden.
