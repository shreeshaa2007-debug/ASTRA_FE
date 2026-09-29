# HANA pre-flight for HACKFEST0119: instructions

**Question this answers:** can the 17-table core schema be created in `HACKFEST0119` on Hackfest-DB?
**What it does not do:** load any CSV, run `03_validate.sql`, drop, rename, alter or replace anything.

**Status: written from SAP's documentation, never run on a HANA tenant.** The 17 `CREATE COLUMN TABLE` statements are byte-for-byte the ones in `01_create_tables.sql` (a test proves it), with the schema written out on every table and `REFERENCES` target. The `DO BEGIN ... SIGNAL ... EXEC` wrapper around them is documented SQLScript, but this exact block has not been executed. That is what the first run finds out.

## 1. Before you paste

1. Open SAP HANA Database Explorer, then open a **new SQL console** on the Hackfest-DB instance. A new console is a new session.
2. In the SQL console preferences set **On error** to **Stop**. If a dialog offers *Skip* or *Skip All* at any point, choose **Stop**, never Skip.

## 2. What to paste

Paste the **entire contents of one file**, and nothing else:

```
db/hana/core/HANA_PREFLIGHT_HACKFEST0119.sql
```

Open it in your editor, Ctrl+A, Ctrl+C, paste into the console, press **Run All (F8)**.

Do **not** paste `01_create_tables.sql`, `02_comments.sql`, `03_validate.sql` or `99_drop_tables.sql`.

**Two ways to create the same 17 tables. Use one, never both.** STEP 2 below is guarded: it refuses to start if any name is taken. `02_create_tables.sql` is the same 17 `CREATE` statements as plain, schema-qualified SQL with no guard and nothing else (no data, no `SET SCHEMA`), which is easier to follow statement by statement. Either way, STEP 3 of this file verifies the result.

The file has four parts, so you can also run one part at a time by selecting it and pressing Run (with a selection, only the selection runs):

| Part | What it is | Changes anything? |
|---|---|---|
| `SET SCHEMA "HACKFEST0119";` | makes the session use the schema | no |
| **STEP 1** (three `SELECT`s) | who you are, does the schema exist, is any of the 17 names taken | no |
| **STEP 2** (one `DO BEGIN ... END;`) | refuses if any name exists, otherwise creates the 17 tables, parents first | **yes: creates 17 empty tables** |
| **STEP 3** (three `SELECT`s) | checks what came out: columns, keys, CHECKs, DECIMAL/DOUBLE types | no |

If you would rather look first, select from `SET SCHEMA` down to the line before the STEP 2 banner, run that, read the result, then run the rest. STEP 2 checks again by itself, so pasting the whole file is also safe.

## 3. What you should see if it works

| Statement | Expected |
|---|---|
| `SET SCHEMA` | success |
| **1a** | one row: `SESSION_SCHEMA` = `HACKFEST0119`, `TARGET_SCHEMA_EXISTS` = 1, `USER_HAS_PRIVILEGES` = `TRUE` |
| **1b** | 17 rows, every `STATUS` = `FREE` |
| **1c** | one row starting `GO: all 17 names are free` |
| **STEP 2** | "successfully executed", no result grid |
| **3a** | 17 rows, every `OUTCOME` = `OK` (164 columns in all) |
| **3b** | 4 rows, every `OUTCOME` = `OK`: column tables 17, primary keys 17, foreign keys 20, CHECK constraints 60 |
| **3c** | 29 rows, every `OUTCOME` = `OK`: every DECIMAL keeps its precision, `TARIFF_RATE_PCT` is `DOUBLE`, `CAPACITY` is `INTEGER` on `SUPPLIER_PRODUCT` and `ROUTE` |

All 17 tables are empty. Success means the schema can be created, nothing more.

## 4. Errors that mean missing privileges

STEP 2 has not created anything if its **first** table (`COUNTRY`) fails, so these are clean stops.

| You see | It means |
|---|---|
| `[258] insufficient privilege` (on `SET SCHEMA`, on the `DO` block, or on a `CREATE`) | your user may not create tables in `HACKFEST0119`. Needs `CREATE ANY` on the schema, or to be its owner. Compare `TARGET_SCHEMA_OWNER` and `CONNECTED_AS` in 1a. |
| 1a shows `USER_HAS_PRIVILEGES` = `FALSE` | same cause, seen earlier |
| `[258]` although you own the schema, or the schema name looks like a managed container | the schema may be an HDI container, where direct DDL is not allowed. Tell me before doing anything else. |
| `[362] invalid schema name`, or `[10001] PRE-FLIGHT STOPPED: schema HACKFEST0119 does not exist` | wrong schema name or wrong instance. Check the console is on Hackfest-DB. |

## 5. Errors that mean a syntax incompatibility

| You see | It means |
|---|---|
| `[257] sql syntax error` with a position in the first lines of the `DO` block, before the first `EXEC` (`DECLARE`, `SELECT ... INTO`, `IF`, `SIGNAL`) | the wrapper is at fault, not the DDL. Nothing was created. |
| `[257] sql syntax error` or `[7] feature not supported` later in the block | one `CREATE` was rejected. Run STEP 3: **the first `MISSING` row in 3a is the table that failed**; the tables above it exist. Send me the full error text. |
| `[260] invalid column name` on 3b or 3c only | a catalog view differs from the documentation. The tables are fine; only the check failed. Send me the error. |
| 3a/3c show `MISMATCH` | the table exists but a type or column count differs from the spec. Send me the rows. |

`[10002] PRE-FLIGHT STOPPED: one or more of the 17 table names already exist` is **not** an error in the script. It is the gate doing its job: nothing was created, dropped or replaced. Run STEP 1b to see which names are taken.

`[288] cannot use duplicate table name` means an object with that name exists that the catalog view did not show you. It was not replaced.

## 6. How to stop safely

1. **Stop at the first surprise.** Do not press Skip, do not re-run, do not edit the SQL to get past it.
2. **Do not run STEP 2 twice.** After a success or a partial run, the gate refuses with `[10002]` because the tables now exist. That is the intended protection.
3. **Find out what exists:** select the STEP 3 statements and run them. They are read-only and safe after any failure.
4. **Do not run `99_drop_tables.sql`, and do not drop or rename anything to make room.** Tables that already existed are not ours to remove. The gate proves none of the 17 names existed when STEP 2 started, so any of them present afterwards were created by that run, and they are empty. If they need removing, send me the STEP 3 output and I will prepare a drop list for exactly those tables, for you to approve.
5. **Do not interrupt STEP 2 while it runs.** HANA normally commits DDL as it goes, so an interrupt can leave a partial set. Expect seconds, not minutes. Cancel only if it hangs, then go to step 3.
6. **Send me:** the full error text, the result of 1b, and the result of 3a.

## 7. After a clean run (not now)

Only after STEP 3 is all `OK` and you say so: optionally `02_comments.sql`, then load the CSVs in the order in `HANA_LOAD_PLAN.md`, then `03_validate.sql` (every `OUTCOME` must be `PASS`).
