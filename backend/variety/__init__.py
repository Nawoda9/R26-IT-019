import logging
import os

from flask import Flask
from flask_cors import CORS
from sqlalchemy import inspect, text

from variety import config
from variety.extensions import db

logger = logging.getLogger(__name__)

# Maps SQLAlchemy column types -> a safe SQLite column definition (with a
# default) to use when ALTER-ing an existing table that predates this column.
_SQLITE_COLUMN_DDL = {
    "INTEGER": "INTEGER NOT NULL DEFAULT 0",
    "FLOAT": "FLOAT NOT NULL DEFAULT 0",
    "TEXT": "TEXT",
    "VARCHAR": "VARCHAR(255)",
    "BLOB": "BLOB",
    "DATETIME": "DATETIME",
    "BOOLEAN": "BOOLEAN NOT NULL DEFAULT 0",
}


def _migrate_missing_columns(app):
    """
    Adds any model columns that are missing from the actual on-disk SQLite
    table (e.g. the table was created before a column such as `user_id`
    was added to the model). `db.create_all()` only creates tables that
    don't exist yet — it never alters existing ones — so without this,
    an old history.db keeps causing
    'no such column: variety_prediction_history.user_id' errors forever.

    Safe to run every startup: it's a no-op once the schema is caught up.
    Only handles SQLite (this module's self-contained history DB); if you
    point VARIETY_DATABASE_URL at MySQL/Postgres, manage migrations with
    Alembic instead.
    """
    engine = db.engine
    if engine.dialect.name != "sqlite":
        return

    inspector = inspect(engine)
    for table in db.metadata.sorted_tables:
        if not inspector.has_table(table.name):
            continue  # brand new table -> create_all() will handle it

        existing_cols = {col["name"] for col in inspector.get_columns(table.name)}
        model_cols = {column.name for column in table.columns}

        # 1. Add columns the model has but the on-disk table is missing
        #    (e.g. `user_id` added after the table already existed).
        for column in table.columns:
            if column.name in existing_cols:
                continue

            col_type = str(column.type).split("(")[0].upper()
            ddl_type = _SQLITE_COLUMN_DDL.get(col_type, "TEXT")
            ddl = f'ALTER TABLE "{table.name}" ADD COLUMN "{column.name}" {ddl_type}'
            logger.warning(
                "Migrating table '%s': adding missing column '%s' (%s)",
                table.name, column.name, ddl_type,
            )
            with engine.begin() as conn:
                conn.execute(text(ddl))

        # 2. Drop columns the on-disk table has but the model no longer
        #    defines (e.g. a leftover `image_filename` NOT NULL column from
        #    an older schema version). Left in place, these break every
        #    insert because SQLAlchemy never supplies a value for them.
        # Requires SQLite >= 3.35 (bundled with Python 3.9+); if your SQLite
        # is older, drop the column manually or delete history.db instead.
        obsolete_cols = existing_cols - model_cols
        for col_name in obsolete_cols:
            ddl = f'ALTER TABLE "{table.name}" DROP COLUMN "{col_name}"'
            logger.warning(
                "Migrating table '%s': dropping obsolete column '%s'",
                table.name, col_name,
            )
            try:
                with engine.begin() as conn:
                    conn.execute(text(ddl))
            except Exception:
                logger.exception(
                    "Could not drop obsolete column '%s' on '%s' "
                    "(SQLite may be too old). Delete history.db manually "
                    "to reset the schema, or upgrade SQLite.",
                    col_name, table.name,
                )


def create_app():
    app = Flask(
        __name__,
        template_folder=os.path.join(config.BASE_DIR, "templates_variety"),
        static_folder=os.path.join(config.BASE_DIR, "static_variety"),
    )
    app.config.from_object("variety.config")

    # Allow the Vite dev server (and any origin in production, tighten as needed)
    # to call the JSON API from a different origin/port.
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    logging.basicConfig(level=logging.INFO)

    db.init_app(app)

    from variety.routes import bp as routes_bp
    app.register_blueprint(routes_bp)

    with app.app_context():
        # Import registers the model with `db` before create_all() runs.
        from variety.history import PredictionHistory  # noqa: F401

        db.create_all()
        _migrate_missing_columns(app)

        # Warm up the model at startup instead of on first request, so the
        # first user doesn't pay the (multi-second) load cost.
        from variety.model import get_predictor
        get_predictor()

    return app