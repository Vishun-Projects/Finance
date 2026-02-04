from typing import Dict, List, Optional

# Mapping of keywords to human-readable commodities/categories
COMMODITY_MAP: Dict[str, str] = {
    # Food & Dining
    "ZOMATO": "Food Delivery",
    "SWIGGY": "Food Delivery",
    "CAFE": "Dining",
    "RESTAURANT": "Dining",
    "HOTEL": "Dining",
    "BAKERY": "Dining",
    "UDUPI": "Dining",
    "COFFEE": "Dining",
    
    # Shopping & Retail
    "AMAZON": "Online Shopping",
    "FLIPKART": "Online Shopping",
    "BLINKIT": "Quick Commerce",
    "ZEPTO": "Quick Commerce",
    "BIGBASKET": "Groceries",
    "JIOMART": "Groceries",
    "RELIANCE": "Shopping",
    "D MART": "Groceries",
    "STATIONERY": "Shopping",
    
    # Services & Bills
    "RECHARGE": "Mobile/DTH Recharge",
    "JIO": "Telecom",
    "AIRTEL": "Telecom",
    "VI ": "Telecom",
    "BESCOM": "Electricity",
    "MSEB": "Electricity",
    "ADANI": "Electricity",
    "GAS": "Gas Bill",
    "INSURANCE": "Insurance",
    "PREMIUM": "Insurance",
    
    # Travel & Transport
    "UBER": "Cabs",
    "OLA": "Cabs",
    "RAPIDO": "Cabs",
    "IRCTC": "Railways",
    "METRO": "Metro",
    "PETROL": "Fuel",
    "PUMP": "Fuel",
    "HPCL": "Fuel",
    "BPCL": "Fuel",
    "IOCL": "Fuel",

    # Health
    "MEDICAL": "Healthcare/Pharmacy",
    "PHARMA": "Healthcare/Pharmacy",
    "HOSPITAL": "Healthcare/Pharmacy",
    "CLINIC": "Healthcare/Pharmacy",
    "APOLLO": "Healthcare/Pharmacy",
    
    # Entertainment
    "SPOTIFY": "Subscription",
    "NETFLIX": "Subscription",
    "PRIME": "Subscription",
    "BOOKMYSHOW": "Movies/Events"
}

def get_commodity(text: str) -> Optional[str]:
    """
    Scans text for category keywords.
    """
    if not text: return None
    upper_text = text.upper()
    for kw, label in COMMODITY_MAP.items():
        if kw in upper_text:
            return label
    return "UPI Transfer" if "UPI" in upper_text else "General"
