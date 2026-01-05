import pandas as pd
from typing import Any, Tuple, Union, Optional, Dict

def safe_get_dataframe(result: Any) -> pd.DataFrame:
    """
    Safely extract DataFrame from a result that might be a tuple, DataFrame, or None.
    
    Args:
        result: The return value from a parser function
        
    Returns:
        pd.DataFrame: A DataFrame (empty if extraction fails)
    """
    if result is None:
        return pd.DataFrame()
        
    if isinstance(result, pd.DataFrame):
        return result
        
    if isinstance(result, tuple):
        if len(result) >= 1 and isinstance(result[0], pd.DataFrame):
            return result[0]
        # Try to find a DataFrame in the tuple
        for item in result:
            if isinstance(item, pd.DataFrame):
                return item
                
    return pd.DataFrame()

def safe_get_metadata(result: Any) -> Dict[str, Any]:
    """
    Safely extract metadata from a result that might be a tuple.
    
    Args:
        result: The return value from a parser function
        
    Returns:
        dict: Metadata dictionary (empty if extraction fails)
    """
    if isinstance(result, tuple) and len(result) >= 2:
        metadata = result[1]
        if isinstance(metadata, dict):
            return metadata
            
    return {}
