"""Phase 4 step 1: turns the corrected demand table (data/cleaned/demand.csv —
one row per day a sale actually happened, cancellations netted out) into a
proper dense daily panel for forecasting.

This fixes a real methodology gap found while starting Phase 4: Phase 3's
lag_1/lag_7/rolling_mean_* columns were computed on the SPARSE series, so
"lag_1" actually meant "the previous day that had a sale," not "yesterday" —
for an intermittent product that sells once a week, that silently turns a
1-day lag into a week-old value. Densifying to a full daily calendar (missing
days = demand_quantity 0) and recomputing features on that is what makes
lag/rolling actually mean what their names say.

As of the retrain that fixed ml/artifacts/xgboost_demand's documented
staleness (see data/cleaned/DATA_READINESS_REPORT.md section 6, "the trained
forecast model is stale"), this reads data/cleaned/demand.csv (cancellations
correctly netted per sale line) rather than the earlier data/processed/demand.csv
(which double-counted some cancelled orders as demand). The corrected panel's
top-40 series differ from Phase 3's (2 products swap, per the readiness
report), so OUTPUT_PATH must NOT be data/processed/demand_modeling_panel.csv:
the running application's forecast_series() reads that exact file for live
demand history regardless of which model checkpoint is loaded, and
data/processed/suppliers.csv (an unrelated, untouched Phase 3 file) still
names the old product set — overwriting it in place breaks that file's
product_id contract out from under it. This writes a sibling file instead, so
data/processed/demand_modeling_panel.csv and everything that reads it (the
live app, backend/tests/test_sourcing_agent.py's product-id consistency
check, ...) are unaffected by a retrain.

Scope: full-catalog dense forecasting (19,133 product x location series) is a
production scaling concern, not a hackathon-MVP one. This selects the top
`TOP_K` series by total volume, restricted to series with at least
`MIN_ACTIVE_DAYS` active days so a "top series" isn't a single 80,995-unit
one-off bulk order with no actual pattern to forecast (a real example in this
dataset — see the module's own selection report for the count excluded this
way).
"""
from __future__ import annotations

from pathlib import Path

import pandas as pd

from backend.services.preprocessing import disruptions as disruptions_mod
from backend.services.preprocessing.features import build_feature_panel

DEMAND_PATH = Path("data/cleaned/demand.csv")
OUTPUT_PATH = Path("data/processed/demand_modeling_panel_cleaned.csv")

TOP_K = 40
MIN_ACTIVE_DAYS = 100


def select_series(sparse: pd.DataFrame) -> pd.DataFrame:
    stats = (
        sparse.groupby(["product_id", "location_id"])
        .agg(total_demand=("demand_quantity", "sum"), active_days=("date", "nunique"))
        .reset_index()
    )
    eligible = stats[stats["active_days"] >= MIN_ACTIVE_DAYS]
    selected = eligible.sort_values("total_demand", ascending=False).head(TOP_K)
    return selected


def densify(sparse: pd.DataFrame, selected_keys: pd.DataFrame, full_date_range: pd.DatetimeIndex) -> pd.DataFrame:
    """Reindexes each selected (product_id, location_id) series onto the full
    daily calendar, filling missing days with demand_quantity=0 — the real
    fix, not a workaround: a day with no sale is zero demand, not a missing
    row.
    """
    rows = []
    for _, key in selected_keys.iterrows():
        pid, loc = key["product_id"], key["location_id"]
        series = sparse[(sparse["product_id"] == pid) & (sparse["location_id"] == loc)]
        series = series.set_index("date")["demand_quantity"].reindex(full_date_range, fill_value=0)
        rows.append(
            pd.DataFrame(
                {
                    "date": full_date_range,
                    "product_id": pid,
                    "location_id": loc,
                    "demand_quantity": series.values,
                }
            )
        )
    return pd.concat(rows, ignore_index=True)


def build_modeling_panel() -> tuple[pd.DataFrame, dict]:
    sparse = pd.read_csv(DEMAND_PATH, usecols=["date", "product_id", "location_id", "demand_quantity"], low_memory=False)
    sparse["date"] = pd.to_datetime(sparse["date"])
    sparse["product_id"] = sparse["product_id"].astype(str)

    stats = sparse.groupby(["product_id", "location_id"]).agg(active_days=("date", "nunique")).reset_index()
    n_total_series = len(stats)
    n_excluded_low_density = int((stats["active_days"] < MIN_ACTIVE_DAYS).sum())

    selected = select_series(sparse)
    full_range = pd.date_range(sparse["date"].min(), sparse["date"].max(), freq="D")

    dense = densify(sparse, selected, full_range)

    disruptions_df, _ = disruptions_mod.build_disruptions_table()
    featured = build_feature_panel(dense, disruptions_df)

    report = {
        "total_series_in_sparse_data": n_total_series,
        "series_excluded_below_min_active_days": n_excluded_low_density,
        "min_active_days_threshold": MIN_ACTIVE_DAYS,
        "series_selected": len(selected),
        "top_k_requested": TOP_K,
        "full_date_range": [str(full_range.min().date()), str(full_range.max().date())],
        "dense_panel_rows": len(featured),
        "disruption_active_rows": int(featured["disruption_active"].sum()),
        "split_counts": featured["split"].value_counts().to_dict(),
        "excluded_example": "product 23843: 80,995 units in a single day (active_days=1) — a one-off bulk "
        "order, not a forecastable pattern; excluded by the active_days floor, not by volume rank",
    }

    featured.to_csv(OUTPUT_PATH, index=False)
    return featured, report


if __name__ == "__main__":
    import json

    panel, report = build_modeling_panel()
    print(json.dumps(report, indent=2))
    print(f"\nWrote {OUTPUT_PATH} ({len(panel)} rows)")
