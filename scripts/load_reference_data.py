"""Load the processed reference datasets (data/processed/*.csv) into a database — SAP HANA Cloud, or any database
SQLAlchemy can reach — as the `ref_*` tables the application reads when it runs with DATA_BACKEND=sql.

    python scripts/load_reference_data.py                              into the configured database (DATABASE_URL / a bound HANA)
    python scripts/load_reference_data.py --database-url "hana+hdbcli://USER:PASSWORD@HOST:443?encrypt=true"
    python scripts/load_reference_data.py --only suppliers routes      just those datasets
    python scripts/load_reference_data.py --dry-run                    show where it would load, change nothing

Each dataset is replaced in one transaction; running it twice is the same as once. Build the CSVs first (the Phase 3-5
pipelines, see README.md).
"""
from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # run from anywhere, not only the repo root

from backend.data.datasets import DATASETS  # noqa: E402
from backend.data.loader import load_csvs_into  # noqa: E402
from backend.database.engine import DatabaseTarget, build_engine, resolve_database_target  # noqa: E402


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--database-url", default=None, help="default: DATABASE_URL, else a bound HANA instance, else ./resilientsc.db")
    parser.add_argument("--schema", default=None, help="the schema to load into (default: DATABASE_SCHEMA or the binding's)")
    parser.add_argument("--data-dir", default="data/processed")
    parser.add_argument("--only", nargs="+", choices=sorted(DATASETS), help="load just these datasets")
    parser.add_argument("--no-create", action="store_true", help="fail rather than create a missing table (the tables were deployed separately)")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    target = resolve_database_target(args.database_url, args.schema)
    names = args.only or list(DATASETS)
    print(f"target : {target.describe()}")
    print(f"tables : {', '.join(DATASETS[n].table_name for n in names)}")
    if args.dry_run:
        print("dry run: nothing was changed")
        return 0
    engine = build_engine(DatabaseTarget(target.url, target.schema, target.source))
    counts = load_csvs_into(engine, args.data_dir, names=names, create=not args.no_create)
    for name, rows in counts.items():
        print(f"loaded {rows:>7,} rows into {DATASETS[name].table_name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
