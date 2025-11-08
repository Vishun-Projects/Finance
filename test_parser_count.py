import pdfplumber
import re

pdf = pdfplumber.open('AccountStatement_28-10-2025 11_00_46.pdf')

total_date_lines = 0
for i in range(len(pdf.pages)):
    text = pdf.pages[i].extract_text()
    lines = text.split('\n')
    date_lines = [l for l in lines if re.search(r'\d{1,2}\s+[A-Za-z]{3}\s+\d{4}', l)]
    if i < 10:
        print(f'Page {i}: {len(date_lines)} date lines')
    total_date_lines += len(date_lines)

print(f'Total date lines across all pages: {total_date_lines}')

