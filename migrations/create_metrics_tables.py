"""
This script creates the necessary database tables for API metrics tracking.
Run this script after setting up the main database to add metrics tracking capabilities.
"""

import sys
import os
import sqlite3
from datetime import datetime
from app.services.logger import setup_logging

logger = setup_logging(__name__)

# Path to the SQLite database file
DB_PATH = os.path.join('instance', 'app.db')

def create_metrics_tables():
    """Create the metrics tables in the database."""
    try:
        # Connect to the SQLite database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Create APICall table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS api_call (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            api_id TEXT NOT NULL,
            user_id INTEGER,
            timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            status_code INTEGER NOT NULL,
            response_time REAL NOT NULL,
            endpoint TEXT NOT NULL,
            method TEXT NOT NULL,
            is_success BOOLEAN NOT NULL,
            error_message TEXT,
            FOREIGN KEY (user_id) REFERENCES user (id)
        )
        ''')
        
        # Create APIDailyMetric table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS api_daily_metric (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            api_id TEXT NOT NULL,
            date DATE NOT NULL,
            total_calls INTEGER NOT NULL DEFAULT 0,
            successful_calls INTEGER NOT NULL DEFAULT 0,
            failed_calls INTEGER NOT NULL DEFAULT 0,
            avg_response_time REAL NOT NULL DEFAULT 0.0,
            UNIQUE(api_id, date)
        )
        ''')
        
        # Create indexes for better performance
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_api_call_api_id ON api_call (api_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_api_call_timestamp ON api_call (timestamp)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_api_call_user_id ON api_call (user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_api_daily_metric_date ON api_daily_metric (date)')
        
        # Commit the changes
        conn.commit()
        logger.info("Successfully created metrics tables")
        print("Successfully created metrics tables!")
        
    except Exception as e:
        logger.error(f"Error creating metrics tables: {e}")
        print(f"Error creating metrics tables: {e}")
        return False
    finally:
        # Close the connection
        if conn:
            conn.close()
    
    return True

def main():
    """Main function to run the migration."""
    print("Creating API metrics tables...")
    if create_metrics_tables():
        print("Migration completed successfully!")
    else:
        print("Migration failed!")
        sys.exit(1)

if __name__ == "__main__":
    main() 