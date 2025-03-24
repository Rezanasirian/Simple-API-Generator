#!/usr/bin/env python3
"""
Migration script to create the API Key table for user API key management.
Run this script to create the necessary database structure for API keys.
"""

import os
import sys
import sqlite3
from datetime import datetime

def create_api_key_table():
    """Create the API Key table in the database."""
    try:
        # Connect to the database
        print("Connecting to database...")
        conn = sqlite3.connect('instance/app.db')
        cursor = conn.cursor()
        
        # Check if table already exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='api_key'")
        if cursor.fetchone():
            print("API Key table already exists, skipping creation.")
            return True
            
        print("Creating API Key table...")
        
        # Create the API key table
        cursor.execute('''
        CREATE TABLE api_key (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            key TEXT NOT NULL UNIQUE,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            last_used_at TIMESTAMP,
            is_active BOOLEAN NOT NULL DEFAULT 1,
            FOREIGN KEY (user_id) REFERENCES user(id)
        )
        ''')
        
        # Create indices for better performance
        cursor.execute('CREATE INDEX idx_api_key_user_id ON api_key(user_id)')
        cursor.execute('CREATE INDEX idx_api_key_key ON api_key(key)')
        
        # Commit changes and close connection
        conn.commit()
        conn.close()
        
        print("API Key table created successfully.")
        return True
        
    except Exception as e:
        print(f"Error creating API Key table: {str(e)}")
        return False

def main():
    """Run the migration."""
    print("Starting API Key table migration...")
    success = create_api_key_table()
    
    if success:
        print("Migration completed successfully!")
    else:
        print("Migration failed. See above for details.")
        sys.exit(1)

if __name__ == "__main__":
    main() 