#!/usr/bin/env python
"""Run the whole demo with one command.

    python scripts/demo.py                 start the backend and the UI, seed one finished run, open the browser
    python scripts/demo.py --check         only check that everything the demo needs is in place (starts nothing)
    python scripts/demo.py --check --live  ... and make one real call to the language model
    python scripts/demo.py --fresh         start from an empty database (deletes ./resilientsc.db first)
    python scripts/demo.py --no-seed --no-open

What it does, in order: checks the prerequisites (packages, the built datasets and model, node, free ports),
starts uvicorn (ONE worker: run state is per process) and the Vite dev server, waits until the backend says it
is ready, runs the Suez scenario once so the dashboard and the Agent Monitor have something to show, warms the
model and the scenario comparisons so the first click is not slow, then prints the URLs and waits. Ctrl+C stops
both. Logs go to .demo-logs/ (JSON lines for the backend: grep a simulation id to follow it).

It uses only the standard library, so it runs before anything is installed.
"""
from __future__ import annotations

import argparse
import atexit
import importlib.util
import json
import os
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
import warnings
import webbrowser
from pathlib import Path

warnings.filterwarnings("ignore")  # the launcher only diagnoses; SciPy's NumPy-version notice is noise here
ROOT = Path(__file__).resolve().parent.parent
LOG_DIR = ROOT / ".demo-logs"
PACKAGES = ("fastapi", "uvicorn", "pandas", "numpy", "xgboost", "scipy", "sqlalchemy", "yaml", "joblib", "pydantic")
GREEN, RED, YELLOW, DIM, RESET = "\033[32m", "\033[31m", "\033[33m", "\033[2m", "\033[0m"
if not sys.stdout.isatty() or os.environ.get("NO_COLOR"):
    GREEN = RED = YELLOW = DIM = RESET = ""


# --------------------------------------------------------------------------- environment
def load_dotenv(path: Path) -> list[str]:
    """Reads KEY=VALUE lines into os.environ without overriding anything already set. Returns the names it set."""
    loaded: list[str] = []
    if not path.exists():
        return loaded
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key, value = key.strip(), value.strip().strip("'\"")
        if key and value and key not in os.environ:
            os.environ[key] = value
            loaded.append(key)
    return loaded


def port_is_free(port: int) -> bool:
    with socket.socket() as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 0)
        try:
            s.bind(("127.0.0.1", port))
            return True
        except OSError:
            return False


def sqlite_file(database_url: str) -> Path | None:
    """The file behind a sqlite:/// URL (relative paths are relative to the repo root), or None for anything else."""
    if not database_url.startswith("sqlite:///") or database_url.endswith(":memory:"):
        return None
    path = Path(database_url[len("sqlite:///"):])
    return path if path.is_absolute() else ROOT / path


# --------------------------------------------------------------------------- preflight
class Check:
    def __init__(self, name: str, ok: bool, detail: str, required: bool = True):
        self.name, self.ok, self.detail, self.required = name, ok, detail, required

    def line(self) -> str:
        mark = f"{GREEN}ok{RESET}" if self.ok else (f"{RED}FAIL{RESET}" if self.required else f"{YELLOW}warn{RESET}")
        return f"  [{mark}] {self.name:<16} {self.detail}"


def preflight(api_port: int, web_port: int) -> list[Check]:
    checks: list[Check] = []
    missing = [p for p in PACKAGES if importlib.util.find_spec(p) is None]
    checks.append(Check("python packages", not missing,
                        f"{sys.executable}" if not missing else f"missing {', '.join(missing)} for {sys.executable} — pip install -r requirements.txt (or run this with the interpreter that has them)"))

    sys.path.insert(0, str(ROOT))
    os.chdir(ROOT)  # data and config paths are relative to the repo root
    try:
        from backend.api.readiness import REQUIRED_DATA
        from backend.models.forecasting.predictor import ARTIFACTS_ROOT
        absent = [p for p in REQUIRED_DATA if not (ROOT / p).exists()]
        checks.append(Check("datasets", not absent, "all processed datasets present" if not absent else f"missing {', '.join(absent)} — run the Phase 3-5 pipelines"))
        versions = sorted(p.name for p in (ROOT / ARTIFACTS_ROOT).iterdir() if (p / "model.json").exists()) if (ROOT / ARTIFACTS_ROOT).exists() else []
        checks.append(Check("forecast model", bool(versions), f"artifact {', '.join(versions)}" if versions else f"no model artifact under {ARTIFACTS_ROOT}"))
    except ModuleNotFoundError as exc:
        checks.append(Check("datasets", False, f"could not check ({exc}); fix the packages above first"))

    node = shutil.which("node")
    vite = ROOT / "frontend" / "node_modules" / "vite" / "bin" / "vite.js"
    checks.append(Check("node", bool(node), node or "node is not installed (https://nodejs.org)"))
    checks.append(Check("frontend deps", vite.exists(), "frontend/node_modules is installed" if vite.exists() else "run `npm install` in frontend/"))
    for label, port in (("api port", api_port), ("web port", web_port)):
        checks.append(Check(label, port_is_free(port), f"{port} is free" if port_is_free(port) else f"{port} is in use — stop what is using it, or pass --{label.replace(' ', '-')} N"))
    has_key = bool(os.environ.get("LLM_API_KEY"))
    checks.append(Check("llm key", has_key, "LLM_API_KEY is set (free-text reports will work)" if has_key else
                        "no LLM_API_KEY: the defined scenarios still run; only free-text reports in the Simulator will fail", required=False))
    return checks


def live_llm_probe() -> Check:
    """One real call: a report that has nothing to do with supply chains must come back NO_DISRUPTION."""
    if not os.environ.get("LLM_API_KEY"):
        return Check("llm live call", False, "skipped: no LLM_API_KEY", required=False)
    sys.path.insert(0, str(ROOT))
    os.chdir(ROOT)
    try:
        from backend.agents.sensing.agent import SensingAgent

        started = time.time()
        result = SensingAgent().sense("The weather in Lisbon looks lovely this weekend, with sunshine and light winds.")
        took = time.time() - started
        ok = result.status == "NO_DISRUPTION"
        return Check("llm live call", ok, f"answered in {took:.1f}s: {result.status}" if ok else f"unexpected result {result.status}: {result.errors or result.rationale}", required=False)
    except Exception as exc:  # noqa: BLE001 — this is a diagnostic; say what happened
        return Check("llm live call", False, f"{type(exc).__name__}: {exc}", required=False)


# --------------------------------------------------------------------------- HTTP helpers
def http_json(method: str, url: str, body: dict | None = None, timeout: float = 60) -> tuple[int, dict]:
    request = urllib.request.Request(url, method=method, data=json.dumps(body).encode() if body is not None else None, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as exc:
        return exc.code, json.loads(exc.read() or b"{}")


def wait_until(check, timeout: float, what: str, procs: dict[str, subprocess.Popen] | None = None) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        for name, proc in (procs or {}).items():
            if proc.poll() is not None:
                raise RuntimeError(f"{name} exited while starting (exit {proc.returncode}); see {LOG_DIR / (name + '.log')}")
        try:
            if check():
                return
        except (urllib.error.URLError, ConnectionError, OSError):
            pass
        time.sleep(0.4)
    raise RuntimeError(f"{what} did not come up within {timeout:.0f}s")


def seed_and_warm(api: str) -> dict:
    """One finished run for the dashboard to show, and the model and scenario comparisons loaded before anyone clicks."""
    seeded: dict = {}
    status, body = http_json("POST", f"{api}/api/scenarios/SUEZ_CLOSURE/run", {})
    if status != 202:
        raise RuntimeError(f"could not seed the Suez scenario: {status} {body}")
    sim = body["data"]["simulation_id"]
    deadline = time.time() + 90
    while time.time() < deadline:
        _, s = http_json("GET", f"{api}/api/simulations/{sim}/status")
        run = s["data"].get("run")
        if run and run["state"] != "RUNNING":
            seeded = {"simulation_id": sim, "status": s["data"]["status"], "outcome": (run.get("outcome") or {}).get("outcome")}
            break
        time.sleep(0.3)
    for scenario in ("SUEZ_CLOSURE", "SUPPLIER_FAILURE", "SEVERE_WEATHER", "TARIFF_INCREASE"):
        http_json("GET", f"{api}/api/scenarios/{scenario}/comparison", timeout=120)  # cached for the Scenarios page
    return seeded


# --------------------------------------------------------------------------- processes
children: dict[str, subprocess.Popen] = {}


def stop_children() -> None:
    for name, proc in list(children.items()):
        if proc.poll() is None:
            proc.terminate()
    for name, proc in list(children.items()):
        try:
            proc.wait(10)
        except subprocess.TimeoutExpired:
            proc.kill()
    children.clear()


def spawn(name: str, cmd: list[str], env: dict, cwd: Path) -> subprocess.Popen:
    LOG_DIR.mkdir(exist_ok=True)
    log = open(LOG_DIR / f"{name}.log", "wb")
    flags = subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0
    proc = subprocess.Popen(cmd, cwd=cwd, env=env, stdout=log, stderr=subprocess.STDOUT, creationflags=flags)
    children[name] = proc
    return proc


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run the ResilientSC demo with one command.")
    parser.add_argument("--check", action="store_true", help="only check the prerequisites; start nothing")
    parser.add_argument("--live", action="store_true", help="with --check: also make one real call to the language model")
    parser.add_argument("--fresh", action="store_true", help="delete the SQLite database first, so nothing from earlier runs shows")
    parser.add_argument("--no-seed", action="store_true", help="do not run the Suez scenario once at startup")
    parser.add_argument("--no-open", action="store_true", help="do not open the browser")
    parser.add_argument("--api-port", type=int, default=8000)
    parser.add_argument("--web-port", type=int, default=5173)
    parser.add_argument("--db", help="SQLite file to use instead of DATABASE_URL / ./resilientsc.db")
    args = parser.parse_args(argv)

    loaded = load_dotenv(ROOT / ".env")
    print(f"{DIM}repo {ROOT}{RESET}" + (f"{DIM}  -  loaded {', '.join(loaded)} from .env{RESET}" if loaded else ""))
    checks = preflight(args.api_port, args.web_port)
    if args.check and args.live:
        checks.append(live_llm_probe())
    print("Preflight:")
    for c in checks:
        print(c.line())
    failed = [c for c in checks if c.required and not c.ok]
    if failed:
        print(f"\n{RED}Not ready:{RESET} {len(failed)} required check(s) failed.")
        return 1
    if args.check:
        print(f"\n{GREEN}Ready to run.{RESET}")
        return 0

    api, web = f"http://127.0.0.1:{args.api_port}", f"http://127.0.0.1:{args.web_port}"
    db_url = os.environ.get("DATABASE_URL", "sqlite:///./resilientsc.db")
    if args.db:
        db_url = f"sqlite:///{Path(args.db).resolve().as_posix()}"
    db_file = sqlite_file(db_url)
    if args.fresh and db_file and db_file.exists():
        db_file.unlink()
        print(f"{DIM}deleted {db_file}{RESET}")

    env = {**os.environ, "DATABASE_URL": db_url, "CORS_ORIGINS": f"{web},http://localhost:{args.web_port}", "LOG_FORMAT": "json", "LOG_LEVEL": "INFO",
           "PYTHONWARNINGS": "ignore", "PYTHONUNBUFFERED": "1"}
    atexit.register(stop_children)
    for sig in [getattr(signal, n) for n in ("SIGINT", "SIGTERM", "SIGBREAK") if hasattr(signal, n)]:
        signal.signal(sig, lambda *_: sys.exit(0))  # SystemExit runs the cleanup below

    try:
        spawn("api", [sys.executable, "-m", "uvicorn", "backend.api.main:app", "--host", "127.0.0.1", "--port", str(args.api_port), "--log-level", "warning"], env, ROOT)
        spawn("web", [shutil.which("node"), "node_modules/vite/bin/vite.js", "--port", str(args.web_port), "--host", "127.0.0.1", "--strictPort"],
              {**env, "VITE_API_BASE_URL": api}, ROOT / "frontend")
        print("Starting the backend and the UI...")
        wait_until(lambda: http_json("GET", f"{api}/api/ready", timeout=5)[0] == 200, 120, "the backend", children)
        wait_until(lambda: urllib.request.urlopen(web, timeout=3).status == 200, 60, "the UI", children)

        seeded: dict = {}
        if not args.no_seed:
            print("Seeding one finished run and warming the model (a few seconds)...")
            seeded = seed_and_warm(api)
        llm_ok = http_json("GET", f"{api}/api/health")[1].get("llm_configured", False)

        print(f"\n{GREEN}The demo is running.{RESET}")
        print(f"  UI        {web}")
        print(f"  API docs  {api}/docs")
        print(f"  health    {api}/api/ready   -   metrics {api}/api/metrics")
        print(f"  language model: {'configured' if llm_ok else f'{YELLOW}NOT configured{RESET} — free-text reports will fail; scenarios still run'}")
        if seeded:
            print(f"  seeded    {seeded['simulation_id']} ({seeded['status']})")
        print(f"  logs      {LOG_DIR}  (backend logs are JSON lines: grep a simulation id)")
        print(f"{DIM}Ctrl+C to stop.{RESET}")
        print("DEMO_READY " + json.dumps({"api": api, "web": web, "seeded": seeded, "pids": {n: p.pid for n, p in children.items()}}), flush=True)
        if not args.no_open:
            webbrowser.open(web)
        while all(p.poll() is None for p in children.values()):
            time.sleep(1)
        dead = next(n for n, p in children.items() if p.poll() is not None)
        print(f"{RED}{dead} stopped unexpectedly{RESET}; see {LOG_DIR / (dead + '.log')}")
        return 1
    except RuntimeError as exc:
        print(f"{RED}{exc}{RESET}")
        return 1
    finally:
        stop_children()


if __name__ == "__main__":
    sys.exit(main())
