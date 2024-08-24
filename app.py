# app.py

# Standard Imports
import logging
import os

# External Imports
from flask import Flask
from flask_migrate import Migrate, upgrade, init as init_migrations, revision, stamp
from sqlalchemy.exc import OperationalError
from alembic.util import CommandError
from sqlalchemy import inspect, text
import sqlalchemy.exc

# Local Imports
from utils.database import init_db
from utils.routes import routes_bp

# Setup logging
logging.basicConfig(level=logging.DEBUG)

def create_app():
    """
    Create and configure the Flask application.

    This function initializes the Flask app, sets up the database connection,
    initializes Flask-Migrate, and registers the routes blueprint.

    Returns:
        tuple: The configured Flask application instance and SQLAlchemy database instance.
    """
    # Create the Flask app
    app = Flask(__name__)

    # Environment variables
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///portall.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.secret_key = os.environ.get('SECRET_KEY', 'M1Hd4l58YKm2Tqci6ZU65sEgWDexjuSfRybf2i4G')

    # Initialize database
    db = init_db(app)

    # Initialize Flask-Migrate
    Migrate(app, db)

    # Register the routes blueprint
    app.register_blueprint(routes_bp)

    return app, db

def check_db_compatibility(db):
    """
    Check if the database schema is compatible with the current models.

    This function compares the existing database schema with the current model definitions
    to determine if they are compatible or if migrations are needed.

    Args:
        db (SQLAlchemy): The SQLAlchemy database instance.

    Returns:
        bool: True if compatible, False otherwise.
    """
    inspector = inspect(db.engine)
    existing_tables = inspector.get_table_names()

    for table in db.metadata.tables.values():
        if table.name not in existing_tables:
            return False

        existing_columns = {col['name'] for col in inspector.get_columns(table.name)}
        model_columns = set(table.columns.keys())

        if existing_columns != model_columns:
            return False

    return True

def init_migrations_folder(app, db):
    """
    Initialize the migrations folder if it doesn't exist.

    This function creates the migrations folder and generates an initial migration
    based on the current model definitions if the folder doesn't already exist.

    Args:
        app (Flask): The Flask application instance.
        db (SQLAlchemy): The SQLAlchemy database instance.
    """
    migrations_folder = os.path.join(os.path.dirname(__file__), 'migrations')
    if not os.path.exists(migrations_folder):
        logging.info("Initializing migrations folder...")
        init_migrations(directory=migrations_folder)

        # Create an initial migration
        revision(directory=migrations_folder, autogenerate=True, message="Initial migration")
        logging.info("Initial migration created.")

def create_temp_tables(db):
    """
    Create temporary tables to store existing data.

    This function creates a temporary copy of each existing table in the database
    to safely store data during the migration process.

    Args:
        db (SQLAlchemy): The SQLAlchemy database instance.

    Returns:
        dict: A dictionary mapping original table names to their temporary counterparts.
    """
    temp_tables = {}
    inspector = inspect(db.engine)

    with db.engine.connect() as conn:
        for table_name in inspector.get_table_names():
            columns = inspector.get_columns(table_name)
            column_definitions = ", ".join([f"{col['name']} {col['type']}" for col in columns])
            temp_table_name = f"temp_{table_name}"

            sql = f"CREATE TABLE {temp_table_name} AS SELECT * FROM {table_name}"
            conn.execute(text(sql))
            temp_tables[table_name] = temp_table_name

            logging.info(f"Created temporary table: {temp_table_name}")

    return temp_tables

def copy_data_to_temp_tables(db, temp_tables):
    """
    Copy data from original tables to temporary tables.

    This function copies all data from the original tables to their temporary counterparts.

    Args:
        db (SQLAlchemy): The SQLAlchemy database instance.
        temp_tables (dict): A dictionary mapping original table names to their temporary counterparts.
    """
    with db.engine.connect() as conn:
        for original_table, temp_table in temp_tables.items():
            sql = f"INSERT INTO {temp_table} SELECT * FROM {original_table}"
            conn.execute(text(sql))
            logging.info(f"Copied data from {original_table} to {temp_table}")

def restore_from_temp_tables(db, temp_tables):
    """
    Restore data from temporary tables if migration fails.

    This function attempts to restore the original database state from the temporary tables
    in case the migration process fails.

    Args:
        db (SQLAlchemy): The SQLAlchemy database instance.
        temp_tables (dict): A dictionary mapping original table names to their temporary counterparts.
    """
    with db.engine.connect() as conn:
        for original_table, temp_table in temp_tables.items():
            try:
                conn.execute(text(f"DROP TABLE {original_table}"))
                conn.execute(text(f"ALTER TABLE {temp_table} RENAME TO {original_table}"))
                logging.info(f"Restored {original_table} from {temp_table}")
            except sqlalchemy.exc.OperationalError:
                logging.warning(f"Could not restore {original_table}. It may not exist in the new schema.")

def migrate_data_from_temp_tables(db, temp_tables):
    """
    Migrate data from temporary tables to the new schema.

    This function copies data from the temporary tables to the newly migrated tables,
    handling cases where columns might have been added, removed, or renamed.

    Args:
        db (SQLAlchemy): The SQLAlchemy database instance.
        temp_tables (dict): A dictionary mapping original table names to their temporary counterparts.
    """
    inspector = inspect(db.engine)

    with db.engine.connect() as conn:
        for original_table, temp_table in temp_tables.items():
            if original_table in inspector.get_table_names():
                new_columns = set(column['name'] for column in inspector.get_columns(original_table))
                temp_columns = set(column['name'] for column in inspector.get_columns(temp_table))

                common_columns = list(new_columns.intersection(temp_columns))
                columns_str = ", ".join(common_columns)

                try:
                    sql = f"INSERT INTO {original_table} ({columns_str}) SELECT {columns_str} FROM {temp_table}"
                    conn.execute(text(sql))
                    logging.info(f"Migrated data from {temp_table} to {original_table}")
                except sqlalchemy.exc.IntegrityError as e:
                    logging.error(f"Integrity error while migrating data to {original_table}: {str(e)}")
                    logging.info(f"Skipping data migration for {original_table}")
            else:
                logging.warning(f"Table {original_table} no longer exists in the new schema. Data migration skipped.")

def cleanup_temp_tables(db, temp_tables):
    """
    Remove temporary tables after successful migration.

    This function drops all temporary tables created during the migration process.

    Args:
        db (SQLAlchemy): The SQLAlchemy database instance.
        temp_tables (dict): A dictionary mapping original table names to their temporary counterparts.
    """
    with db.engine.connect() as conn:
        for temp_table in temp_tables.values():
            conn.execute(text(f"DROP TABLE IF EXISTS {temp_table}"))
            logging.info(f"Dropped temporary table: {temp_table}")

def safe_upgrade(app, db):
    """
    Safely upgrade the database, handling data migration.

    This function orchestrates the entire safe migration process, including
    creating temporary tables, applying migrations, migrating data, and cleanup.

    Args:
        app (Flask): The Flask application instance.
        db (SQLAlchemy): The SQLAlchemy database instance.
    """
    migrations_folder = os.path.join(os.path.dirname(__file__), 'migrations')

    with app.app_context():
        # Step 1: Create temporary tables
        temp_tables = create_temp_tables(db)

        # Step 2: Copy data to temporary tables
        copy_data_to_temp_tables(db, temp_tables)

        # Step 3: Apply new schema
        try:
            logging.info("Applying database migrations...")
            upgrade(directory=migrations_folder)
            logging.info("Migrations applied successfully.")
        except Exception as e:
            logging.error(f"Error applying migrations: {str(e)}")
            restore_from_temp_tables(db, temp_tables)
            raise

        # Step 4: Migrate data from temporary tables to new schema
        migrate_data_from_temp_tables(db, temp_tables)

        # Step 5: Clean up temporary tables
        cleanup_temp_tables(db, temp_tables)

def init_or_migrate_db(app, db):
    """
    Initialize a new database or migrate an existing one.

    This function handles the following scenarios:
    1. Database does not exist: Creates it, initializes migrations, and applies initial migration.
    2. Database exists but is incompatible: Safely upgrades the database.
    3. Database exists and is compatible: No action needed.

    Args:
        app (Flask): The Flask application instance.
        db (SQLAlchemy): The SQLAlchemy database instance.
    """
    with app.app_context():
        try:
            # Try to access the database
            db.engine.connect()
            logging.info("Existing database found.")

            # Ensure migrations folder exists
            init_migrations_folder(app, db)

            # Check if the database is compatible with current models
            if check_db_compatibility(db):
                logging.info("Database is compatible with current models. No migration needed.")
            else:
                logging.info("Database schema is incompatible with current models. Applying safe upgrade...")
                safe_upgrade(app, db)

        except OperationalError:
            logging.info("No existing database found. Creating new database and initializing migrations...")
            # If the database doesn't exist, create it and initialize migrations
            db.create_all()
            init_migrations_folder(app, db)

            migrations_folder = os.path.join(os.path.dirname(__file__), 'migrations')
            stamp(directory=migrations_folder)
            logging.info("New database created, migrations initialized, and database stamped with initial migration.")

# Create the app and get the db instance
app, db = create_app()

# Run application
if __name__ == '__main__':
    # Initialize or migrate the database before starting the app
    init_or_migrate_db(app, db)

    port = int(os.environ.get('PORT', 8080))
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'

    logging.info(f"Starting Portall on port {port} with debug mode: {debug_mode}")

    app.run(debug=debug_mode, host='0.0.0.0', port=port)