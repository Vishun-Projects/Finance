"""
Test Database Schema
===================
Check if the store column actually exists in the database
"""

import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

def test_database_schema():
    """Test if the store column exists in the database."""
    try:
        # Connect to MySQL database
        connection = mysql.connector.connect(
            host='localhost',
            user='root',
            password='your_password',  # You'll need to update this
            database='vishnu_finance'
        )
        
        cursor = connection.cursor()
        
        # Check expenses table structure
        print("=== EXPENSES TABLE STRUCTURE ===")
        cursor.execute("DESCRIBE expenses")
        expenses_columns = cursor.fetchall()
        for column in expenses_columns:
            print(f"Column: {column[0]}, Type: {column[1]}, Null: {column[2]}, Key: {column[3]}")
        
        print("\n=== INCOME_SOURCES TABLE STRUCTURE ===")
        cursor.execute("DESCRIBE income_sources")
        income_columns = cursor.fetchall()
        for column in income_columns:
            print(f"Column: {column[0]}, Type: {column[1]}, Null: {column[2]}, Key: {column[3]}")
        
        cursor.close()
        connection.close()
        
    except Exception as e:
        print(f"Error: {e}")
        print("Please update the database password in the script")

if __name__ == "__main__":
    test_database_schema()
