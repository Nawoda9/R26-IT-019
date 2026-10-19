"""Run from backend/: python main.py. Ctrl+C stops all owned servers."""
import os
from pathlib import Path
import signal
import socket
import subprocess
import sys
import time
from urllib.error import URLError
from urllib.request import ProxyHandler, build_opener

from dotenv import load_dotenv

BASE = Path(__file__).resolve().parent
APPS = [
    ("Login / Treatment Advisor", "app.py", 5003, "/api/health"),
    ("Leaf Wilt", "wclwd_app.py", 5000, "/health"),
    ("Land Survey", "land_app.py", 5001, "/healthz"),
    ("Variety Classifier", "variety_app.py", 5002, "/health"),
]
PROCESSES = []
HTTP = build_opener(ProxyHandler({}))


def port_in_use(port):
    with socket.socket() as connection:
        connection.settimeout(0.3)
        return connection.connect_ex(("127.0.0.1", port)) == 0


def healthy(port, path):
    try:
        with HTTP.open(f"http://127.0.0.1:{port}{path}", timeout=2) as response:
            return response.status == 200
    except (URLError, OSError, ValueError):
        return False


def stop_all():
    # Reloaders are disabled, so each service has one owned process.
    for _, process in PROCESSES:
        if process.poll() is None:
            process.terminate()
    for _, process in PROCESSES:
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()


def interrupted(_signal, _frame):
    raise KeyboardInterrupt


def main():
    load_dotenv(BASE / ".env")
    timeout = float(os.getenv("BACKEND_STARTUP_TIMEOUT", "600"))
    if timeout <= 0:
        raise ValueError("BACKEND_STARTUP_TIMEOUT must be positive")
    # Validate before launching anything. Never stop someone else's server.
    for name, script, port, _ in APPS:
        if not (BASE / script).is_file():
            raise RuntimeError(f"Missing {script}; put this launcher in backend/.")
        if port_in_use(port):
            raise RuntimeError(f"Port {port} for {name} is occupied. Stop the old server first.")
    try:
        for name, script, port, path in APPS:
            environment = os.environ.copy()
            environment.update(PORT=str(port), FLASK_DEBUG="0", PYTHONUNBUFFERED="1")
            # runpy supplies the usual __main__ context while disabling Flask's
            # reloader even in scripts with a hardcoded debug=True setting.
            bootstrap = (
                "import flask,runpy,sys; "
                "original=flask.Flask.run; "
                "flask.Flask.run=lambda self,*a,**kw: original(self,*a,"
                "**dict(kw,debug=False,use_reloader=False)); "
                "runpy.run_path(sys.argv[1],run_name='__main__')"
            )
            print(f"[STARTING] {name} on port {port}", flush=True)
            options = {}
            if os.name == "nt":
                options["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
            process = subprocess.Popen(
                [sys.executable, "-u", "-c", bootstrap, script],
                cwd=BASE, env=environment, **options,
            )
            PROCESSES.append((name, process))
            deadline = time.monotonic() + timeout
            next_notice = time.monotonic() + 15
            while True:
                for running_name, running_process in PROCESSES:
                    code = running_process.poll()
                    if code is not None:
                        raise RuntimeError(f"{running_name} exited with code {code}. Check its error above.")
                if healthy(port, path):
                    print(f"[READY] {name}: http://127.0.0.1:{port}", flush=True)
                    break
                if time.monotonic() >= deadline:
                    raise RuntimeError(f"{name} was not ready after {timeout:g}s. Check its logs and model files.")
                if time.monotonic() >= next_notice:
                    print(f"[WAITING] {name} is still loading...", flush=True)
                    next_notice = time.monotonic() + 15
                time.sleep(1)
        print("[READY] All four backends responded. Keep this terminal open. Ctrl+C stops them.", flush=True)
        failures = set()
        while True:
            for name, process in PROCESSES:
                if process.poll() is not None and name not in failures:
                    failures.add(name)
                    print(f"[OFFLINE] {name} exited with code {process.returncode}. Other servers remain running.", flush=True)
            if len(failures) == len(PROCESSES):
                return 1
            time.sleep(1)
    finally:
        stop_all()
    return 0


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, interrupted)
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n[STOPPED] Backend servers stopped.")
        sys.exit(0)
    except (RuntimeError, ValueError, OSError) as error:
        print(f"[ERROR] {error}", file=sys.stderr, flush=True)
        sys.exit(1)
