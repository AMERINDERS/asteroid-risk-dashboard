import os
from datetime import date
from typing import List, Dict, Any

import requests

NEOWS_FEED_URL = 'https://api.nasa.gov/neo/rest/v1/feed'


def fetch_neows_feed(
    start_date: date,
    end_date: date,
    api_key: str = None,
) -> List[Dict[str, Any]]:
    """
    Fetch close approaches from NASA NeoWs for a date window (max 7 days).
    Returns a flat list of asteroid+approach dicts.
    """
    if api_key is None:
        api_key = os.getenv('NASA_API_KEY')
    if not api_key:
        raise RuntimeError('NASA_API_KEY is not set in .env')

    params = {
        'start_date': start_date.isoformat(),
        'end_date':   end_date.isoformat(),
        'api_key':    api_key,
    }

    response = requests.get(NEOWS_FEED_URL, params=params, timeout=30)
    response.raise_for_status()
    data = response.json()

    flat = []
    for date_key, asteroids in data['near_earth_objects'].items():
        for ast in asteroids:
            for approach in ast['close_approach_data']:
                flat.append({
                    'neo_reference_id':         ast['neo_reference_id'],
                    'name':                     ast['name'],
                    'is_potentially_hazardous': ast['is_potentially_hazardous_asteroid'],
                    'is_sentry_object':         ast.get('is_sentry_object', False),
                    'abs_magnitude':            ast.get('absolute_magnitude_h'),
                    'est_diameter_min_m':       ast['estimated_diameter']['meters']['estimated_diameter_min'],
                    'est_diameter_max_m':       ast['estimated_diameter']['meters']['estimated_diameter_max'],
                    'approach_date':            date.fromisoformat(approach['close_approach_date']),
                    'miss_distance_km':         float(approach['miss_distance']['kilometers']),
                    'miss_distance_lunar':      float(approach['miss_distance']['lunar']),
                    'velocity_kms':             float(approach['relative_velocity']['kilometers_per_second']),
                })
    return flat
