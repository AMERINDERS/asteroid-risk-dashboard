from typing import Dict

import requests

SENTRY_URL = 'https://ssd-api.jpl.nasa.gov/sentry.api'


def fetch_sentry_objects() -> Dict[str, float]:
    """
    Fetch all known impact-risk asteroids from JPL Sentry.
    Returns dict: {neo_reference_id: cumulative_impact_probability}.
    """
    response = requests.get(SENTRY_URL, timeout=30)
    response.raise_for_status()
    data = response.json()

    result = {}
    for entry in data.get('data', []):
        try:
            neo_id = entry['des']
            ip = float(entry['ip'])
            result[neo_id] = ip
        except (KeyError, ValueError):
            continue
    return result
