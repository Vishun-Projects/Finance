"""Batch entity extraction from transaction descriptions (stdin JSON array -> stdout JSON map)."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pipeline.profiles.base import BaseStyle


def main() -> None:
    payload = json.load(sys.stdin)
    descriptions = payload if isinstance(payload, list) else payload.get("descriptions", [])
    style = BaseStyle()
    results = {}

    for description in descriptions:
        if not description or description in results:
            continue
        store, person, _conf, commodity, upi_id = style.extract_entities(str(description))
        results[str(description)] = {
            "store": store,
            "personName": person,
            "upiId": upi_id,
            "commodity": commodity,
        }

    json.dump(results, sys.stdout)


if __name__ == "__main__":
    main()
