# 🏦 Adding a New Bank Style

This guide explains how to add semantic intelligence for a new bank (e.g., extracting store names, recipient names, and categories from messy transaction narratives).

## 🧩 Architecture Overview

The semantic normalization stage is located in `api/parse-pdf-python/pipeline/normalization.py`. It uses a **Style Registry** to select the appropriate logic based on the `bank_code` detected in earlier stages.

1.  **Stage 6 (Bank Detection)** sets `ctx.bank_code`.
2.  **Stage 11 (Normalization)** uses `ctx.bank_code` to look up a `BaseStyle` subclass.
3.  The Style class performs regex-based extraction and cleaning.

## 🛠️ Step-by-Step Onboarding

### 1. Create a Profile Class
Create a new file in `api/parse-pdf-python/pipeline/profiles/[bank_code_lowercase].py`.

Example `hdfc.py`:
```python
from .base import BaseStyle
import re

class HDFCStyle(BaseStyle):
    def extract_entities(self, text):
        # HDFC specific logic...
        return store, person
```

### 2. Register the Style
Update `api/parse-pdf-python/pipeline/normalization.py` to import and map your new class.

```diff
+from .profiles.hdfc import HDFCStyle

STYLE_MAP = {
    "MAHB": MAHBStyle,
+   "HDFC": HDFCStyle,
}
```

### 3. Customize Patterns
You can override standard behavior in your class:

| Method | Purpose |
| :--- | :--- |
| `clean_description` | Strips noise (like "NO REMARKS" or "INR") |
| `extract_entities` | Logic to differentiate between a Store and a Person |
| `classify_commodity` | Logic to categorize as "Food", "Transport", etc. |

### 4. Use `JobContext`
Each style receives the `JobContext` in its constructor. You can use `self.ctx.account_holder_name` to accurately detect "Self-Transactions" instead of labeling the user as an external Person.

## 🧪 Testing your Changes
Run a sample PDF through the pipeline. Check the `Processed Data` table in the UI. If you see dashes (`-`) in the Store/Person column, your regex in `extract_entities` likely didn't match.
