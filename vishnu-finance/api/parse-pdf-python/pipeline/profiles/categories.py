from typing import Dict, List, Optional

# Mapping of keywords to human-readable commodities/categories
COMMODITY_MAP: Dict[str, str] = {
    # Food & Dining
    "ZOMATO": "Food Delivery",
    "SWIGGY": "Food Delivery",
    "MAGICPIN": "Food & Rewards",
    "EATSURE": "Food Delivery",
    "CAFE": "Dining",
    "RESTAURANT": "Dining",
    "HOTEL": "Dining",
    "BAKERY": "Dining",
    "UDUPI": "Dining",
    "COFFEE": "Dining",
    "STARBUCKS": "Drinks/Cafe",
    "DOMINOS": "Fast Food",
    "PIZZA": "Fast Food",
    "BURGER": "Fast Food",
    
    # Shopping & Retail
    "AMAZON": "Online Shopping",
    "FLIPKART": "Online Shopping",
    "AJIO": "Fashion",
    "MYNTRA": "Fashion",
    "BLINKIT": "Quick Commerce",
    "ZEPTO": "Quick Commerce",
    "BIGBASKET": "Groceries",
    "JIOMART": "Groceries",
    "RELIANCE": "Shopping",
    "D MART": "Groceries",
    "DMART": "Groceries",
    "STATIONERY": "Shopping",
    "NYKAA": "Beauty",
    "DECATHLON": "Sports",
    
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
    "LIC": "Insurance",
    
    # Travel & Transport
    "UBER": "Cabs",
    "OLA": "Cabs",
    "RAPIDO": "Cabs",
    "IRCTC": "Railways",
    "INDIGO": "Flights",
    "AIR INDIA": "Flights",
    "MAKEMYTRIP": "Travel",
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
    "PHARMEASY": "Healthcare/Pharmacy",
    
    # Entertainment & Subscriptions
    "SPOTIFY": "Subscription",
    "NETFLIX": "Subscription",
    "PRIME": "Subscription",
    "BOOKMYSHOW": "Movies/Events",
    "YOUTUBE": "Subscription"
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
