"""
main.py — Launch all Coconut Flask backends simultaneously

Usage:
    python main.py

Stop:
    Ctrl+C

All Flask apps live in the same backend/ folder and share
the same Python virtual environment and requirements.txt.
"""

import subprocess
import sys
import os
import signal
import time

from dotenv import load_dotenv


# ============================================================
# PATH CONFIGURATION
# ============================================================

# Since main.py is already inside:
#
# D:\Outsource\2026\coconut-project\backend
#
# BASE_DIR is the backend directory.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Do NOT append another "backend" here.
BACKEND_DIR = BASE_DIR


# ============================================================
# LOAD ENVIRONMENT VARIABLES
# ============================================================

ENV_FILE = os.path.join(BACKEND_DIR, ".env")

if os.path.exists(ENV_FILE):
    load_dotenv(ENV_FILE)
    print(f"[OK]  Loaded environment variables from: {ENV_FILE}")
else:
    print(f"[WARN] .env file not found: {ENV_FILE}")


# ============================================================
# APPLICATION CONFIGURATION
# ============================================================

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
    {
        "name": "Coconut Classifier",
        "script": "app.py",
        "port": 5003,
    },
]


# ============================================================
# PROCESS STORAGE
# ============================================================

processes = []


# ============================================================
# START ALL APPLICATIONS
# ============================================================

def launch_all():

    for app in APPS:

        script_path = os.path.join(
            BACKEND_DIR,
            app["script"]
        )

        # ----------------------------------------------------
        # Check whether the application exists
        # ----------------------------------------------------

        if not os.path.exists(script_path):

            print(
                f"[WARN] '{script_path}' not found "
                f"— skipping {app['name']}"
            )

            continue

        print(
            f"[INFO] Starting {app['name']}..."
        )

        # ----------------------------------------------------
        # Copy current environment
        # ----------------------------------------------------

        env = os.environ.copy()

        # Give this application its own port
        env["PORT"] = str(app["port"])

        # ----------------------------------------------------
        # Start Flask application
        # ----------------------------------------------------

        proc = subprocess.Popen(
            [
                sys.executable,
                app["script"]
            ],
            cwd=BACKEND_DIR,
            env=env
        )

        processes.append(proc)

        print(
            f"[OK]  Started '{app['name']}' "
            f"(PID {proc.pid}) "
            f"→ http://localhost:{app['port']}"
        )

        # Small delay so the applications don't all
        # start at exactly the same time.
        time.sleep(0.5)


# ============================================================
# SHUTDOWN
# ============================================================

def shutdown(sig=None, frame=None):

    print("\n[INFO] Shutting down all servers...")

    # --------------------------------------------------------
    # Terminate all running processes
    # --------------------------------------------------------

    for proc in processes:

        if proc.poll() is None:

            try:
                proc.terminate()

            except Exception:
                pass

    # --------------------------------------------------------
    # Wait for processes to stop
    # --------------------------------------------------------

    for proc in processes:

        try:

            proc.wait(timeout=5)

        except subprocess.TimeoutExpired:

            print(
                f"[WARN] Process {proc.pid} "
                f"did not stop gracefully. Killing..."
            )

            try:
                proc.kill()

            except Exception:
                pass

    print("[INFO] All servers stopped.")

    sys.exit(0)


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    # --------------------------------------------------------
    # Handle Ctrl+C
    # --------------------------------------------------------

    signal.signal(
        signal.SIGINT,
        shutdown
    )

    # --------------------------------------------------------
    # Handle termination signal
    # --------------------------------------------------------

    signal.signal(
        signal.SIGTERM,
        shutdown
    )

    # --------------------------------------------------------
    # Header
    # --------------------------------------------------------

    print("=" * 55)
    print(
        "  Coconut Diagnostics Suite — Multi-App Launcher"
    )
    print("=" * 55)

    print(
        f"[INFO] Backend directory: {BACKEND_DIR}"
    )

    # --------------------------------------------------------
    # Start applications
    # --------------------------------------------------------

    launch_all()

    print("-" * 55)

    if processes:

        print(
            "  All available servers are running."
        )

        print(
            "  Press Ctrl+C to stop all."
        )

    else:

        print(
            "  No servers were started."
        )

    print(
        "  Frontend (run separately): "
        "cd frontend && npm run dev\n"
    )

    # --------------------------------------------------------
    # Keep launcher alive
    # --------------------------------------------------------

    try:

        while True:

            active_processes = [
                proc
                for proc in processes
                if proc.poll() is None
            ]

            # If all child processes stopped
            if not active_processes:

                print(
                    "[WARN] All backend processes have stopped."
                )

                break

            time.sleep(1)

    except KeyboardInterrupt:

        shutdown()