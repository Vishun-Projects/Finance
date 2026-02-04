# Authority Bank Pipeline: The 14-Stage Architecture

This document explains how the PDF Parsing Pipeline handles different bank formats and how to "fine-tune" a new bank style.

## 🏛️ Pipeline Overview

The pipeline is designed to be **Structural First, Semantic Second**.

1.  **Stages 1-5 (Core Extraction)**: Use computer vision and layout analysis to group text into rows and columns. This is bank-agnostic.
2.  **Stage 6 (Bank Detection)**: Identifies the bank (e.g., `MAHB`, `IDIB`).
3.  **Stage 7-8 (Candidate Generation)**: Maps spatial columns (Date, Description, Amount) into raw objects.
4.  **Stage 9 (Inference)**: Decides if an amount is a Debit or Credit based on balance delta.
5.  **Stage 11 (Semantic Normalization)**: **The "Fine-Tuning" Layer**. This is where we handle bank-specific quirks.

---

## 🎨 Adding a New Bank Style

If you encounter a bank with a messy narrative (like "INR" noise or split names), follow these steps:

### 1. Create a Style Profile
Create a new file in `pipeline/profiles/[bank_code].py`.

```python
from .base import BaseStyle

class MyNewBankStyle(BaseStyle):
    # Regex of words to strip from the narrative
    TRASH_WORDS = [r"\bSOME_NOISE\b", r"\bCODE_\d*\b"]

    def extract_entities(self, text):
        # text here is the raw narrative
        # Return (StoreName, PersonName)
        if "VENDOR" in text:
            return "Vendor Name", None
        return None, "Person Name"
```

### 2. Register the Style
Update `pipeline/normalization.py`:

```python
STYLE_MAP = {
    "MAHB": MAHBStyle,
    "IDIB": IDBIStyle,
    "NEW_CODE": MyNewBankStyle # <-- Register here
}
```

### 3. Update Bank Detection
Update `pipeline/bank_detection.py` to ensure the `KNOWN_BANKS` dictionary can catch the new bank name or IFSC code.

---

## 🔍 Best Practices for Normalization

- **Trust the Balance**: Stage 9 handles the "Math" part. Stage 11 only handles "Text Cleanup".
- **Regex over Hardcoding**: Use `re.search` with `re.IGNORECASE`.
- **UPI Fragments**: Most Indian bank narratives use `/` or `UPI` as delimiters. Use these as anchors to split names from transaction IDs.
- **Trash Keywords**: Use `TRASH_WORDS` in the profile to keep the code clean.

---
*Created by Antigravity*
