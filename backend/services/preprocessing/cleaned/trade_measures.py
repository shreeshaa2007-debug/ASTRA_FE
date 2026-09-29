"""Non-tariff measures (NTM) prevalence by country and sector — a separate signal from tariff.csv's applied tariff
rate, not an extension of it.

Structure matches the UNCTAD/World Bank Non-Tariff Measures database's prevalence-by-sector export (the WITS/TRAINS
NTM data family). The file was provided directly rather than downloaded from a logged URL in this environment, so the
exact publisher URL and vintage are NOT independently re-verified here (see data/dataset_registry.yaml's
ntm_prevalence_sector_unctad entry for the full caveat).

Grain: (reporter_iso3, sector, ntm_type_count_bucket) -> the share of that reporter-sector's products falling in that
bucket. 'All Import Products' is a reporter-level aggregate sector mixed in alongside the 15 named sectors and is kept,
not filtered, so a consumer must actively exclude it if only granular sectors are wanted.
"""
from __future__ import annotations

import pandas as pd

from backend.services.preprocessing.cleaned import RAW_DIR, REAL

NTM_CSV = RAW_DIR / "ntm_prevalence_sector_unctad" / "NTM-Prevalence-Sector.csv"
NTM_SOURCE = ("Structure matches the UNCTAD/World Bank NTM prevalence-by-sector export (WITS/TRAINS); "
              "not independently re-verified against the publisher in this workspace")


def build_ntm_prevalence_table() -> tuple[pd.DataFrame, dict]:
    raw = pd.read_csv(NTM_CSV, encoding="utf-8-sig")
    table = pd.DataFrame(
        {
            "reporter_iso3": raw["ReporterIS03"].str.strip(),
            "sector": raw["Sector"].str.strip(),
            "ntm_type_count_bucket": raw["NTM Type Count"].str.strip(),
            "share_pct": raw["Share %"].astype(float),
            "affected_product_count": raw["NTM affected product - count"].astype("int64"),
        }
    )
    table["source"] = NTM_SOURCE
    table["provenance"] = REAL

    report = {
        "rows": len(table),
        "reporters": int(table["reporter_iso3"].nunique()),
        "sectors": int(table["sector"].nunique()),
        "buckets": sorted(table["ntm_type_count_bucket"].unique().tolist()),
        "share_pct_range": [float(table["share_pct"].min()), float(table["share_pct"].max())],
    }
    return table, report
