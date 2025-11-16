"""
AI-Enhanced Transaction Parser
==============================
Uses Gemini AI to parse complex transaction descriptions when standard parsing fails.
Falls back to basic parsing if AI quota is exceeded or parsing fails.
"""

import os
import json
import re
from typing import Dict, Optional, List
import requests
from datetime import datetime


class AIParser:
    """AI-powered parser for complex transaction descriptions."""
    
    # Cache for AI results to avoid re-parsing same descriptions
    _cache: Dict[str, Dict] = {}
    
    @staticmethod
    def parse_transaction_with_ai(
        description: str,
        raw_text: str = '',
        bank_code: str = '',
        previous_date: Optional[str] = None
    ) -> Optional[Dict]:
        """
        Use Gemini AI to parse complex transaction descriptions.
        Falls back to basic parsing if AI fails or quota is exceeded.
        
        Args:
            description: Transaction description text
            raw_text: Raw transaction text from PDF/Excel
            bank_code: Bank code for context
            previous_date: Previous transaction date (for date inference)
            
        Returns:
            Dictionary with parsed fields:
            - store: Store/merchant name
            - personName: Person name from UPI transactions
            - upiId: UPI ID (with spacing fixed)
            - commodity: Product/item purchased
            - transferType: Type of transfer (UPI, NEFT, RTGS, etc.)
            - transactionId: Transaction reference number
            - branch: Branch name
            - cleanDescription: Cleaned description
            - date: Extracted date (if found in description)
            - amount: Extracted amount (if found in description)
            - parsingMethod: "ai" or "ai_fallback"
            - parsingConfidence: Confidence score (0-1)
        """
        if not description and not raw_text:
            return None
        
        # Check cache first
        cache_key = f"{description}_{raw_text}"
        if cache_key in AIParser._cache:
            return AIParser._cache[cache_key]
        
        # Check if AI is available (check quota)
        if not AIParser._is_ai_available():
            return None
        
        try:
            # Call Gemini API
            result = AIParser._call_gemini_api(description, raw_text, bank_code, previous_date)
            
            if result:
                # Cache the result
                AIParser._cache[cache_key] = result
                return result
        except Exception as e:
            print(f"⚠️ AI parsing error: {e}")
            # Don't cache errors - allow retry
        
        return None
    
    @staticmethod
    def _is_ai_available() -> bool:
        """Check if AI quota is available."""
        # Check environment variable or quota status
        # For now, assume available unless explicitly disabled
        api_key = os.getenv('GOOGLE_API_KEY')
        if not api_key:
            return False
        
        # Could add quota checking logic here
        # For now, return True if API key exists
        return True
    
    @staticmethod
    def _call_gemini_api(
        description: str,
        raw_text: str,
        bank_code: str,
        previous_date: Optional[str] = None
    ) -> Optional[Dict]:
        """
        Call Gemini API to parse transaction description.
        
        Returns:
            Parsed transaction data or None if failed
        """
        api_key = os.getenv('GOOGLE_API_KEY')
        if not api_key:
            return None
        
        # Prepare prompt
        prompt = f"""Extract structured data from this Indian bank transaction description.
Fix any spacing issues in UPI IDs, person names, and store names.

Transaction Description: "{description}"
Raw Text: "{raw_text}"
Bank: {bank_code}
Previous Transaction Date: {previous_date or 'N/A'}

Extract and return a JSON object with the following fields:
- store: Store/merchant name (if available, null otherwise)
- personName: Person name from UPI transactions (if available, null otherwise)
- upiId: UPI ID (format: name@bank, fix spacing issues like "mamtavishw akarma0948@okhdfcbank" -> "mamtavishwakarma0948@okhdfcbank")
- commodity: Product/item purchased (if available, null otherwise)
- transferType: Type of transfer (UPI, NEFT, RTGS, IMPS, etc., null otherwise)
- transactionId: Transaction reference number (if available, null otherwise)
- branch: Branch name (if available, null otherwise)
- cleanDescription: Cleaned description without technical codes and UPI details
- date: Extracted date in YYYY-MM-DD format (if found in description, null otherwise)
- amount: Extracted amount as number (if found in description, null otherwise)

IMPORTANT:
1. Fix spacing in UPI IDs: "/mamtavishw akarma0948@okhdfcbank" -> "mamtavishwakarma0948@okhdfcbank"
2. Extract person names from patterns like "HDFC0002504/MAMTA - INR 60.00 MUNSHEELAL VISHWAKARMA" -> "MAMTA MUNSHEELAL VISHWAKARMA"
3. Remove technical terms like "ANCH : ATM SERVICE BRANCH", "XXXXX", "UPI/", etc. from cleanDescription
4. For YES Bank format: "/mamtavishwakarma0948@okhdfcbank ANCH : ATM SERVICE BRANCH" -> extract upiId and personName from UPI ID
5. If date is found in description, extract it in YYYY-MM-DD format
6. If amount is found in description, extract it as a number

Return ONLY valid JSON, no other text. Example:
{{
  "store": "Sangam Stationery Stores",
  "personName": null,
  "upiId": null,
  "commodity": "pens",
  "transferType": "UPI",
  "transactionId": "411950138862",
  "branch": "ATM SERVICE BRANCH",
  "cleanDescription": "Sangam Stationery Stores - pens",
  "date": null,
  "amount": null
}}"""
        
        try:
            # Call Gemini API
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={api_key}"
            
            payload = {
                "contents": [{
                    "parts": [{
                        "text": prompt
                    }]
                }],
                "generationConfig": {
                    "temperature": 0.1,
                    "topK": 20,
                    "topP": 0.8,
                    "maxOutputTokens": 512,
                }
            }
            
            response = requests.post(url, json=payload, timeout=10)
            response.raise_for_status()
            
            result = response.json()
            
            # Extract text from response
            if 'candidates' in result and len(result['candidates']) > 0:
                text = result['candidates'][0]['content']['parts'][0]['text']
                
                # Parse JSON from response
                json_match = re.search(r'\{[\s\S]*\}', text)
                if json_match:
                    parsed = json.loads(json_match.group(0))
                    
                    # Add parsing metadata
                    parsed['parsingMethod'] = 'ai'
                    parsed['parsingConfidence'] = 0.85  # AI parsing has high confidence
                    
                    return parsed
        
        except requests.exceptions.RequestException as e:
            print(f"⚠️ Gemini API request error: {e}")
        except json.JSONDecodeError as e:
            print(f"⚠️ Failed to parse Gemini JSON response: {e}")
        except Exception as e:
            print(f"⚠️ Unexpected error in AI parsing: {e}")
        
        return None
    
    @staticmethod
    def parse_batch_with_ai(
        descriptions: List[tuple],
        bank_code: str = ''
    ) -> List[Optional[Dict]]:
        """
        Parse multiple transactions in batch for efficiency.
        
        Args:
            descriptions: List of tuples (description, raw_text, previous_date)
            bank_code: Bank code for context
            
        Returns:
            List of parsed transaction dictionaries (None for failed parsing)
        """
        results = []
        
        # Process in smaller batches to avoid quota issues
        batch_size = 10
        for i in range(0, len(descriptions), batch_size):
            batch = descriptions[i:i + batch_size]
            
            for desc, raw, prev_date in batch:
                result = AIParser.parse_transaction_with_ai(
                    desc, raw, bank_code, prev_date
                )
                results.append(result)
        
        return results
    
    @staticmethod
    def clear_cache():
        """Clear the AI parsing cache."""
        AIParser._cache.clear()

