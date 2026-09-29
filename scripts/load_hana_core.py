"""Load data/cleaned into the 17 core tables of the ResilientSC HANA model, parents first.

    python scripts/load_hana_core.py                         DRY RUN (the default): check all 17 CSVs against the model, in memory. No database.
    python scripts/load_hana_core.py --rehearse              create, load and validate in an in-memory SQLite database (a rehearsal, not HANA)
    python scripts/load_hana_core.py --check-target --schema S   connect to HANA and LOOK: who you are, which tables exist, how many rows. Writes nothing.
    python scripts/load_hana_core.py --execute --schema S    load into SAP HANA Cloud; the target comes from DATABASE_URL or a HANA binding

`--check-target` and `--execute` are the only modes that connect to anything; both require an explicit --schema, and both refuse a SQLite
target. The tables are created beforehand (db/hana/core/HANA_PREFLIGHT_<SCHEMA>.sql). Nothing here ever drops a table or touches a CSV.
`--execute` refuses to write unless every one of the 17 tables exists with the model's columns and is EMPTY, loads each in dependency order
in its own transaction, then reads every row count back from HANA and compares it with the CSV.

    --resume      after a load that stopped part-way: leave tables that already hold exactly their expected rows, load the empty ones
    --create      run 01_create_tables.sql first (the tables must not exist yet; the pre-flight already does this)
    --truncate    DELETE every row of the 17 tables first (destructive; never needed by the normal path)
    --validate    run 03_validate.sql after the load and exit 1 if any check FAILs

Read db/hana/core/HANA_LOAD_PLAN.md first: it lists the decisions that need approval and the exact commands.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # run from anywhere, not only the repo root

from backend.database import hana_core, hana_core_load as load  # noqa: E402
from backend.database.hana_core_spec import TABLES  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SQL_DIR = ROOT / "db" / "hana" / "core"  # anchored to the repository, not to whatever directory the command was typed in
DATA_DIR = ROOT / load.DEFAULT_DATA_DIR  # data/cleaned


def show_scorecard(rows: list[dict]) -> int:
    """Prints a summary and every row that is not a PASS; returns the number of FAILs."""
    counts = {o: sum(1 for r in rows if r["OUTCOME"] == o) for o in ("PASS", "WARN", "FAIL")}
    print(f"validation: {counts['PASS']} PASS, {counts['WARN']} WARN, {counts['FAIL']} FAIL ({len(rows)} checks)")
    for r in rows:
        if r["OUTCOME"] != "PASS":
            print(f"  {r['OUTCOME']:4s} [{r['CHECK_GROUP']}] {r['CHECK_NAME']}: actual {r['ACTUAL']}, expected {r['EXPECTED']}")
    return counts["FAIL"]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--data-dir", default=str(DATA_DIR))
    parser.add_argument("--sql-dir", default=str(SQL_DIR))
    parser.add_argument("--rehearse", action="store_true", help="a local trial in memory; connects to nothing")
    parser.add_argument("--execute", action="store_true", help="load into SAP HANA Cloud (requires --schema)")
    parser.add_argument("--check-target", action="store_true", help="connect to HANA and report what is there, writing nothing (requires --schema)")
    parser.add_argument("--resume", action="store_true", help="after a partial load: skip tables that are already complete, load the empty ones")
    parser.add_argument("--schema", default=None, help="the HANA schema to load into; required with --execute")
    parser.add_argument("--database-url", default=None, help="default: DATABASE_URL, else a bound HANA instance")
    parser.add_argument("--create", action="store_true", help="run 01_create_tables.sql first")
    parser.add_argument("--truncate", action="store_true", help="DELETE all rows of the 17 tables first (destructive)")
    parser.add_argument("--validate", action="store_true", help="run 03_validate.sql after loading")
    args = parser.parse_args(argv)
    data_dir, sql_dir = Path(args.data_dir), Path(args.sql_dir)
    if "processed" in data_dir.resolve().parts or "raw" in data_dir.resolve().parts:
        print(f"{data_dir} is not the cleaned layer: this loader reads data/cleaned only.")
        return 2
    if not (data_dir / "manifest.json").exists():
        print(f"{data_dir} has no manifest.json: build the cleaned layer first (python -m backend.services.preprocessing.cleaned.build).")
        return 2

    print(f"pre-flight: reading {len(TABLES)} CSVs from {data_dir} and checking every value, key and foreign key in memory ...")
    pre = load.preflight(data_dir)
    for table in TABLES:
        print(f"  {table.name:24s} {pre.rows.get(table.name, 0):>9,} rows")
    if not pre.ok:
        print("\nthe cleaned data does not fit the model:\n  " + "\n  ".join(pre.errors))
        return 2
    print(f"pre-flight passed: {sum(pre.rows.values()):,} rows, all types, keys and foreign keys fit.")

    if args.rehearse:
        print("\nrehearsal: in-memory SQLite, the same DDL, the same loader, the same validation logic (NOT HANA).")
        connection = load.sqlite_connection((sql_dir / "01_create_tables.sql").read_text(encoding="utf-8"))
        load.load_tables(connection, data_dir)
        rows = load.run_validation(connection, hana_core.render_validation_sql(hana_core.read_facts(data_dir), dialect="sqlite"))
        return 1 if show_scorecard(rows) else 0

    if not (args.execute or args.check_target):
        print()
        print("dry run: nothing was created, loaded or connected to. Use --rehearse for a local trial, --check-target --schema S to look at HANA, --execute --schema S to load it.")
        return 0

    # ---- from here on it connects to a real database ----
    if not args.schema:
        print("--execute and --check-target need an explicit --schema: this script will not guess where to create tables.")
        return 2
    if not re.fullmatch(r"[A-Za-z0-9_#$]+", args.schema):
        print(f"{args.schema!r} is not a plausible schema name.")
        return 2
    if args.check_target and (args.execute or args.create or args.truncate):
        print("--check-target only looks: it cannot be combined with --execute, --create or --truncate.")
        return 2
    from sqlalchemy.engine import make_url  # noqa: PLC0415
    from backend.database.engine import build_engine, resolve_database_target  # noqa: PLC0415  (only these modes need the driver stack)

    target = resolve_database_target(args.database_url, args.schema)
    if target.is_sqlite:
        print("the resolved target is SQLite; this is for SAP HANA. Set DATABASE_URL to the HANA URL or bind an instance.")
        return 2
    print()
    print(f"target: {target.describe()}")
    try:
        connection = build_engine(target).raw_connection()
    except Exception as exc:  # noqa: BLE001  every way a connection fails gets the reason and what to look at, never the password
        print("could not connect: " + load.explain_connection_error(exc, make_url(target.url).password))
        return 2
    try:
        cursor = connection.cursor()
        cursor.execute(f'SET SCHEMA "{args.schema}"')
        if args.create:
            for statement in load.split_statements((sql_dir / "01_create_tables.sql").read_text(encoding="utf-8")):
                cursor.execute(statement)
            connection.commit()
            print("created the 17 tables")
        if args.truncate:
            load.empty_tables(connection)
            print("emptied the 17 tables")
        code = load.run_load(connection, data_dir, pre.rows, args.schema, resume=args.resume, read_only=args.check_target)
        if code or args.check_target:
            return code
        if args.validate:
            try:
                rows = load.run_validation(connection, (sql_dir / "03_validate.sql").read_text(encoding="utf-8"))
            except Exception as exc:  # noqa: BLE001  the rows are committed; only the deep check could not run
                print(f"the rows are loaded and their counts verified, but 03_validate.sql could not run: {type(exc).__name__}: {str(exc).splitlines()[0][:300]}")
                return 1
            return 1 if show_scorecard(rows) else 0
        print("run 03_validate.sql (or re-run with --resume --validate) before trusting the values.")
        return 0
    finally:
        connection.close()


if __name__ == "__main__":
    raise SystemExit(main())
