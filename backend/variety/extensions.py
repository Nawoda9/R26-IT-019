"""
Re-exports the *main* app's shared extension instances so this module reuses
the same database (and therefore the same `users` table + login session)
instead of standing up a separate one.

variety_app.py is always run with `backend/` as the working directory (see
its docstring), so the top-level `extensions.py` there is importable as-is.
"""

from extensions import db, login_manager  # noqa: F401
