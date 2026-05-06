import math
from typing import Dict, Any, Optional

# Tunable weights — must sum to 1.0
WEIGHTS = {
    'miss_distance': 0.40,
    'diameter':      0.30,
    'velocity':      0.15,
    'hazard_flag':   0.15,
}

# Reference ranges for normalisation
MAX_LUNAR_SAFE = 30.0   # 30 lunar distances = essentially zero risk
MAX_DIAM_M     = 1000.0 # 1 km diameter = max diameter score
MAX_VEL_KMS    = 70.0   # 70 km/s = upper bound for normalisation


def score_approach(asteroid: Dict[str, Any], sentry_ip: Optional[float] = None) -> float:
    """
    Compute a 0-100 danger score for one close approach.
    Higher = more dangerous.
    """
    # 1. Miss distance — closer = higher score (inverted scale)
    miss_lunar = asteroid['miss_distance_lunar']
    miss_score = max(0.0, 1.0 - (miss_lunar / MAX_LUNAR_SAFE))

    # 2. Diameter — bigger = higher score
    diam_max = asteroid.get('est_diameter_max_m') or 0.0
    diam_score = min(1.0, diam_max / MAX_DIAM_M)

    # 3. Velocity — faster = more kinetic energy on impact
    vel = asteroid['velocity_kms']
    vel_score = min(1.0, vel / MAX_VEL_KMS)

    # 4. NASA hazardous flag — straight bonus
    hazard_score = 1.0 if asteroid['is_potentially_hazardous'] else 0.0

    # Weighted combination → 0.0 to 1.0
    score_0_to_1 = (
        miss_score   * WEIGHTS['miss_distance'] +
        diam_score   * WEIGHTS['diameter']      +
        vel_score    * WEIGHTS['velocity']      +
        hazard_score * WEIGHTS['hazard_flag']
    )

    # 5. Sentry boost — log scale, capped at +20 points
    if sentry_ip is not None and sentry_ip > 0:
        sentry_boost = min(0.20, max(0.0, (math.log10(sentry_ip) + 7) / 35))
        score_0_to_1 = min(1.0, score_0_to_1 + sentry_boost)

    return round(score_0_to_1 * 100.0, 1)
