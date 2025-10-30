
import sys
import os
sys.path.append(r'C:\\Users\\vishnu.vishwakarma\\Desktop\\Projects\\Finance\\vishnu-finance\\tools')

# Import the multi-format parser
from multi_format_parser import parse_file
from pathlib import Path
import pandas as pd

def main():
    file_path = Path(r"C:\\Users\\vishnu.vishwakarma\\Desktop\\Projects\\Finance\\vishnu-finance\\uploads\\statement_1761648075785undefined")
    csv_path = Path(r"C:\\Users\\vishnu.vishwakarma\\Desktop\\Projects\\Finance\\vishnu-finance\\uploads\\extracted_1761648075912.csv")
    
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    print(f"Parsing {file_path.suffix.upper()} file: {file_path.name}")

    df = parse_file(file_path)
    
    if df.empty:
        print("No transactions found")
        return
    
    # Convert dates
    df["date_iso"] = pd.to_datetime(df["date"], errors="coerce").dt.date
    
    # Save to CSV
    df.to_csv(csv_path, index=False)

    print(f"SUCCESS: Extracted {len(df)} transactions.")
    print(f"CSV saved to: {csv_path}")

if __name__ == "__main__":
    main()
