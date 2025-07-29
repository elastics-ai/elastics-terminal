#!/usr/bin/env python3
"""
Apply database migrations for new features
"""
import sqlite3
import os
import sys
from pathlib import Path
from datetime import datetime

def apply_migration(db_path: str, migration_file: str):
    """Apply a SQL migration file to the database"""
    print(f"Applying migration: {migration_file}")
    
    # Read migration SQL
    with open(migration_file, 'r') as f:
        migration_sql = f.read()
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Execute migration
        cursor.executescript(migration_sql)
        conn.commit()
        print(f"✓ Successfully applied migration: {migration_file}")
        
    except Exception as e:
        conn.rollback()
        print(f"✗ Error applying migration: {e}")
        raise
    finally:
        conn.close()

def create_migrations_table(db_path: str):
    """Create migrations tracking table if it doesn't exist"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT UNIQUE NOT NULL,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.commit()
    conn.close()

def is_migration_applied(db_path: str, migration_file: str) -> bool:
    """Check if a migration has already been applied"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT COUNT(*) FROM migrations WHERE filename = ?",
        (os.path.basename(migration_file),)
    )
    
    count = cursor.fetchone()[0]
    conn.close()
    
    return count > 0

def record_migration(db_path: str, migration_file: str):
    """Record that a migration has been applied"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute(
        "INSERT INTO migrations (filename) VALUES (?)",
        (os.path.basename(migration_file),)
    )
    
    conn.commit()
    conn.close()

def main():
    # Get database path
    if len(sys.argv) > 1:
        db_path = sys.argv[1]
    else:
        # Default paths
        db_path = os.environ.get("DB_PATH", "/data/volatility_filter.db")
        if not os.path.exists(db_path):
            # Try local path
            project_root = Path(__file__).parent.parent.parent.parent
            db_path = project_root / "volatility_filter.db"
    
    print(f"Database path: {db_path}")
    
    if not os.path.exists(db_path):
        print(f"Error: Database not found at {db_path}")
        sys.exit(1)
    
    # Create migrations table
    create_migrations_table(db_path)
    
    # Get all migration files
    migrations_dir = Path(__file__).parent
    migration_files = sorted(migrations_dir.glob("*.sql"))
    
    print(f"Found {len(migration_files)} migration files")
    
    # Apply each migration
    applied_count = 0
    for migration_file in migration_files:
        if is_migration_applied(db_path, str(migration_file)):
            print(f"⏭️  Skipping already applied: {migration_file.name}")
            continue
        
        try:
            apply_migration(db_path, str(migration_file))
            record_migration(db_path, str(migration_file))
            applied_count += 1
        except Exception as e:
            print(f"Failed to apply {migration_file.name}: {e}")
            sys.exit(1)
    
    print(f"\n✅ Applied {applied_count} new migrations")
    print(f"Database schema is up to date!")

if __name__ == "__main__":
    main()