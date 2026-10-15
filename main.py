"""
main.py — Launch both Flask backends simultaneously
Usage: python main.py
Stop:  Ctrl+C  (kills all child processes cleanly)

Both apps live in the SAME backend/ folder and share ONE requirements.txt /
ONE Python environment (see backend/requirements.txt). Each is still its own
Flask process on its own port, same pattern as the water-quality launcher
this was adapted from — just with cwd pinned to backend/ since both scripts
live there together.
"""

import subprocess
import sys
import os
import signal
import time

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")

APPS = [
    {
        "name": "WCLWD Leaf Diagnostic",
        "script": "wclwd_app.py",
        "port": 5000,
    },
    {
        "name": "Canopy & Land Survey",
        "script": "land_app.py",
        "port": 5001,
    },
    {
        "name": "Coconut Variety Classifier",
        "script": "variety_app.py",
        "port": 5002,
    },
]

processes = []


def launch_all():
    for app in APPS:
        script_path = os.path.join(BACKEND_DIR, app["script"])
        if not os.path.exists(script_path):
            print(f"[WARN] '{script_path}' not found — skipping {app['name']}")
            continue

        proc = subprocess.Popen(
            [sys.executable, app["script"]],
            cwd=BACKEND_DIR,
            # Each app reads its own PORT env var if set; otherwise uses its own default
            env={**os.environ, "PORT": str(app["port"])},
        )
        processes.append(proc)
        print(f"[OK]  Started '{app['name']}' (PID {proc.pid}) → http://localhost:{app['port']}")
        time.sleep(0.5)  # small stagger so log output doesn't interleave badly


def shutdown(sig=None, frame=None):
    print("\n[INFO] Shutting down all servers…")
    for proc in processes:
        proc.terminate()
    for proc in processes:
        proc.wait()
    print("[INFO] All servers stopped.")
    sys.exit(0)


if __name__ == "__main__":
    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    print("=" * 55)
    print("  Coconut Diagnostics Suite — Multi-App Launcher")
    print("=" * 55)
    launch_all()
    print("-" * 55)
    print("  All servers running. Press Ctrl+C to stop all.")
    print("  Frontend (run separately): cd frontend && npm run dev\n")

    # Keep the launcher alive while children run
    for proc in processes:
        proc.wait()
