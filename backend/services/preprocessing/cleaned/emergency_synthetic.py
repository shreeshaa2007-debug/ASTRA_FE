"""Four SYNTHETIC reference tables from a Kaggle sample-data bundle's "emergency situation" extract.

These are NOT real disruption, trade-route, commodity or country history. Verified synthetic three independent ways
(see data/dataset_registry.yaml's emergency_situation_synthetic_kaggle entry for the full finding):

1. Date coverage runs from 2015-01-01 to 2026-12-31 — into the future relative to when this was built.
2. COMMODITY_MARKET's oil_price shows no crash during the real March-April 2020 COVID oil-price collapse.
3. COUNTRY_METADATA lists the United States as 'Low income' and India's population as 430M — both real countries'
   real attributes are scrambled/randomized, not measured.

These tables exist for Sensing-agent stress-testing volume — the same role as suppliers.py's scenario*.csv tables —
and must never be merged with or presented alongside the REAL disruption_event, route or country tables.

geopolitical_event_synthetic keeps 3 rows (MAJOR001-3) whose event names and dates match real events (a COVID supply
shock, the Russia-Ukraine War, the Red Sea Crisis); their numeric fields (duration_days, risk_increase) are still not
sourced, so the whole row stays SYNTHETIC — `is_named_real_event` flags them rather than silently equating them with
the other 10,000 uniformly-distributed placeholder rows.
"""
from __future__ import annotations

import pandas as pd

from backend.services.preprocessing.cleaned import RAW_DIR, SYNTHETIC

EMERGENCY_DIR = RAW_DIR / "emergency_situation_synthetic_kaggle"
BUNDLE_SOURCE = "Kaggle sample-data bundle extract; verified SYNTHETIC, not real history (see data/dataset_registry.yaml)"
NAMED_REAL_EVENTS = {"MAJOR001", "MAJOR002", "MAJOR003"}


def build_geopolitical_event_synthetic() -> tuple[pd.DataFrame, dict]:
    raw = pd.read_csv(EMERGENCY_DIR / "GEOPOLITICAL_EVENTS.csv")
    table = raw.rename(columns={"date": "event_date"})
    # mixed formats: the 10,000 base rows are "YYYY-MM-DD HH:MM:SS", the 3 MAJOR* rows are date-only "YYYY-MM-DD"
    table["event_date"] = pd.to_datetime(table["event_date"], format="mixed")
    table["is_named_real_event"] = table["event_id"].isin(NAMED_REAL_EVENTS)
    table["source"] = BUNDLE_SOURCE
    table["provenance"] = SYNTHETIC

    report = {
        "rows": len(table),
        "named_real_event_rows": int(table["is_named_real_event"].sum()),
        "event_types": sorted(table["event_type"].unique().tolist()),
        "date_range": [str(table["event_date"].min().date()), str(table["event_date"].max().date())],
    }
    return table, report


def build_trade_route_synthetic() -> tuple[pd.DataFrame, dict]:
    raw = pd.read_csv(EMERGENCY_DIR / "ROUTE_INTEGRATED.csv")
    table = raw.rename(columns={"date": "week_date"})
    table["week_date"] = pd.to_datetime(table["week_date"])
    table["source"] = BUNDLE_SOURCE
    table["provenance"] = SYNTHETIC

    report = {
        "rows": len(table),
        "route_ids": int(table["route_id"].nunique()),
        "date_range": [str(table["week_date"].min().date()), str(table["week_date"].max().date())],
        "route_status_counts": table["route_status"].value_counts().to_dict(),
    }
    return table, report


def build_commodity_market_synthetic() -> tuple[pd.DataFrame, dict]:
    raw = pd.read_csv(EMERGENCY_DIR / "COMMODITY_MARKET.csv")
    table = raw.rename(columns={"date": "week_date"})
    table["week_date"] = pd.to_datetime(table["week_date"])
    table["source"] = BUNDLE_SOURCE
    table["provenance"] = SYNTHETIC

    report = {
        "rows": len(table),
        "date_range": [str(table["week_date"].min().date()), str(table["week_date"].max().date())],
    }
    return table, report


def build_country_metadata_synthetic() -> tuple[pd.DataFrame, dict]:
    raw = pd.read_csv(EMERGENCY_DIR / "COUNTRY_METADATA.csv")
    table = raw.rename(columns={"country": "country_name"})
    table["source"] = BUNDLE_SOURCE
    table["provenance"] = SYNTHETIC

    report = {
        "rows": len(table),
        "iso3_values": sorted(table["iso3"].unique().tolist()),
        "warning": ("iso3 correctly identifies real countries; every other attribute (population, gdp_per_capita, "
                    "income_group, ...) is synthetic/randomized and must not be treated as that country's real statistic"),
    }
    return table, report
