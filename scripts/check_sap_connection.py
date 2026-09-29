"""The first thing to run on a real SAP tenant: does each piece the deployment depends on actually work?

    python scripts/check_sap_connection.py                          uses the environment (DATABASE_URL, VCAP_SERVICES, DATA_BACKEND, AUTH_*, EVENTS_*)
    python scripts/check_sap_connection.py --database-url "hana+hdbcli://USER:PASSWORD@HOST:443?encrypt=true&sslValidateCertificate=true"
    python scripts/check_sap_connection.py --token "<a JWT from your identity provider>"   also verify that token and show who it is
    python scripts/check_sap_connection.py --send-test-event                              also POST one event to EVENTS_WEBHOOK_URL

Each check says PASS, FAIL or SKIP and, on a failure, what to look at. It changes nothing that outlives it: the database
round trip uses a simulation it deletes afterwards. Exit code 0 only if nothing failed.
"""
from __future__ import annotations

import argparse
import os
import sys
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Mapping

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # run from anywhere, not only the repo root

from sqlalchemy import text  # noqa: E402

from backend.data.repository import datasets_from_env  # noqa: E402
from backend.database.engine import build_engine, resolve_database_target  # noqa: E402


@dataclass
class Check:
    name: str
    status: str  # PASS | FAIL | SKIP
    detail: str

    def line(self) -> str:
        return f"{self.status:5} {self.name:26} {self.detail}"


def _short(exc: Exception) -> str:
    return f"{type(exc).__name__}: {str(exc).splitlines()[0][:240] if str(exc) else ''}"


def check_database(env: Mapping[str, str], database_url: str | None) -> list[Check]:
    target = resolve_database_target(database_url, env=env)
    checks: list[Check] = []
    try:
        engine = build_engine(target)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1 FROM DUMMY" if not target.is_sqlite and "hana" in str(target.url) else "SELECT 1"))
        checks.append(Check("database: connect", "PASS", target.describe()))
    except Exception as exc:  # noqa: BLE001 — every way a connection can fail is a FAIL with the reason
        hint = " (is `pip install -r requirements-sap.txt` done? is the host reachable and the user's password right?)" if "hana" in str(target.url) else ""
        return [Check("database: connect", "FAIL", f"{target.describe()} -> {_short(exc)}{hint}")]

    try:
        from backend.database.world_state_repository import SqlAlchemyWorldStateRepository
        from backend.services.world_state import Baseline, WorldStateStore
        repository = SqlAlchemyWorldStateRepository(target.url, schema=target.schema)
        store = WorldStateStore(repository, baseline_loader=Baseline)  # an empty baseline: this checks the tables, not the reference data
        simulation_id = f"check-{uuid.uuid4().hex[:10]}"
        created = store.create("CONNECTION_CHECK", simulation_id=simulation_id, actor="check_sap_connection")
        try:
            store.reset(simulation_id)  # a second write, so the compare-and-swap path runs too
            assert store.get(simulation_id).version == created.version + 1
            history = [c.checkpoint for c in store.history(simulation_id)]
            assert history == ["simulation_created", "simulation_reset"], history
        finally:
            store.delete(simulation_id)
        checks.append(Check("database: world-state tables", "PASS", "create, reset, read back and delete a simulation"))
    except Exception as exc:  # noqa: BLE001
        checks.append(Check("database: world-state tables", "FAIL",
                            f"{_short(exc)} — if the tables do not exist and the user may not create them, run db/hana/schema.sql and set DATABASE_AUTO_CREATE=false"))
    return checks


def check_datasets(env: Mapping[str, str]) -> Check:
    try:
        repository = datasets_from_env(env)
        missing = repository.missing()
        if missing:
            return Check("reference data", "FAIL", f"{repository.describe()}: missing {', '.join(missing)} — python scripts/load_reference_data.py")
        rows = len(repository.load("routes"))
        return Check("reference data", "PASS", f"{repository.describe()}: every dataset present ({rows} routes read back)")
    except Exception as exc:  # noqa: BLE001
        return Check("reference data", "FAIL", _short(exc))


def check_auth(env: Mapping[str, str], token: str | None) -> list[Check]:
    from backend.api.security import NoAuthenticator, build_authenticator_from_env
    try:
        authenticator = build_authenticator_from_env(env)
    except Exception as exc:  # noqa: BLE001
        return [Check("authentication: config", "FAIL", _short(exc))]
    if isinstance(authenticator, NoAuthenticator):
        return [Check("authentication: config", "PASS", "OFF (AUTH_MODE=none, and no XSUAA instance is bound): every caller may do everything")]
    checks = [Check("authentication: config", "PASS", authenticator.describe())]
    if token is None:
        checks.append(Check("authentication: token", "SKIP", "pass --token to verify a real token against the identity provider's keys"))
        return checks
    try:
        principal = authenticator.authenticate(f"Bearer {token}")
        checks.append(Check("authentication: token", "PASS", f"{principal.name} ({'person' if principal.is_user else 'technical client'}), scopes {sorted(principal.scopes) or 'none'}"))
    except Exception as exc:  # noqa: BLE001 — AuthenticationError carries only a safe message
        checks.append(Check("authentication: token", "FAIL", _short(exc) + " — the issuer, audience or keys URL may not match the token's"))
    return checks


def check_events(env: Mapping[str, str], send: bool) -> Check:
    from backend.integration import DomainEvent, NullPublisher, build_publisher_from_env
    try:
        publisher = build_publisher_from_env(env)
    except Exception as exc:  # noqa: BLE001
        return Check("events: config", "FAIL", _short(exc))
    try:
        status = publisher.status()
        if isinstance(publisher, NullPublisher):
            return Check("events", "SKIP", "EVENTS_BACKEND is none: nothing is published")
        if not send:
            return Check("events: config", "PASS", f"{status['backend']} -> {status.get('target', 'the log')} (--send-test-event to deliver one)")
        event = DomainEvent(id=f"check:{uuid.uuid4().hex[:8]}", type="com.resilientsc.connection.check", source="urn:resilientsc", subject="connection-check",
                            time="1970-01-01T00:00:00+00:00", data={"note": "sent by scripts/check_sap_connection.py; safe to ignore"})
        inner = getattr(publisher, "_inner", publisher)  # deliver synchronously: the point is to see whether it worked
        inner.publish(event)
        return Check("events: delivery", "PASS", f"delivered to {status.get('target')}")
    except Exception as exc:  # noqa: BLE001
        return Check("events: delivery", "FAIL", _short(exc))
    finally:
        publisher.close(1.0)


def check_llm(env: Mapping[str, str]) -> Check:
    from backend.agents.sensing.llm import llm_configured, llm_provider_name
    name = llm_provider_name(env)
    return Check("language model", "PASS" if llm_configured(env) else "SKIP",
                 f"provider {name!r} is configured (no call made)" if llm_configured(env) else f"provider {name!r} is not configured: free-text reports cannot be sensed (scenarios and structured signals still work)")


def run_checks(env: Mapping[str, str], *, database_url: str | None = None, token: str | None = None, send_test_event: bool = False) -> list[Check]:
    checks = check_database(env, database_url)
    checks.append(check_datasets(env if database_url is None else {**env, "DATABASE_URL": database_url}))
    checks += check_auth(env, token)
    checks.append(check_events(env, send_test_event))
    checks.append(check_llm(env))
    return checks


def main(argv: list[str] | None = None, env: Mapping[str, str] | None = None, out: Callable[[str], None] = print) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--database-url", default=None)
    parser.add_argument("--token", default=None)
    parser.add_argument("--send-test-event", action="store_true")
    args = parser.parse_args(argv)
    checks = run_checks(os.environ if env is None else env, database_url=args.database_url, token=args.token, send_test_event=args.send_test_event)
    for check in checks:
        out(check.line())
    failed = [c for c in checks if c.status == "FAIL"]
    out(f"\n{len(checks) - len(failed)} of {len(checks)} passed or skipped; {len(failed)} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
