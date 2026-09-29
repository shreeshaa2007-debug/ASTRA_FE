"""Macro and supply-chain-pressure indicators: CPI, industrial production, oil price, the NY Fed's Global Supply
Chain Pressure Index (GSCPI), and Port of LA vessel dwell time.

Column names strongly match well-known published series (NY Fed GSCPI, BLS/FRED CPI-U all-items/goods/services,
Federal Reserve G.17 Industrial Production, a crude oil price series, Port of LA / Marine Exchange of Southern
California vessel dwell time), but the file was provided directly rather than downloaded from a logged URL, so this
attribution is inferred from column semantics and NOT independently re-verified against each publisher (see
data/dataset_registry.yaml's supply_chain_pressure_dwell_index entry).

Monthly grain, 2001-01 to 2025-09. The four dwell/vessel columns (dwell_composite, dwell_la_raw, la_unique_vessels,
dwell_la_detrended) are blank before 2009-01 — left as NaN, not filled or backfilled.

Not joined to demand_modeling_panel (daily, 2010-12 to 2011-12 only): any such join would be many-to-one by month and
has not been done in this pass (see data/dataset_registry.yaml's data_quality_issues for this dataset).
"""
from __future__ import annotations

import pandas as pd

from backend.services.preprocessing.cleaned import RAW_DIR, REAL

MACRO_CSV = RAW_DIR / "supply_chain_pressure_dwell_index" / "analysis_dataset_dwell.csv"
MACRO_SOURCE = ("Column names match NY Fed GSCPI / BLS CPI-U / Federal Reserve G.17 INDPRO / an oil price series / "
                "Port of LA vessel dwell time; not independently re-verified against each publisher in this workspace")


def build_supply_chain_pressure_index() -> tuple[pd.DataFrame, dict]:
    raw = pd.read_csv(MACRO_CSV)
    table = raw.copy()
    table["date"] = pd.to_datetime(table["date"])
    table["source"] = MACRO_SOURCE
    table["provenance"] = REAL

    dwell_populated = table["dwell_composite"].notna()
    report = {
        "rows": len(table),
        "date_range": [str(table["date"].min().date()), str(table["date"].max().date())],
        "dwell_columns_first_populated": str(table.loc[dwell_populated, "date"].min().date()) if dwell_populated.any() else None,
        "dwell_columns_null_count": int((~dwell_populated).sum()),
        "gscpi_range": [float(table["gscpi"].min()), float(table["gscpi"].max())],
    }
    return table, report
