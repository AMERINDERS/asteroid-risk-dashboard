from app.services.risk_scorer import score_approach


def base_asteroid(**overrides):
    """Build an asteroid dict with safe defaults."""
    base = {
        'is_potentially_hazardous': False,
        'est_diameter_max_m': 100.0,
        'miss_distance_lunar': 10.0,
        'velocity_kms': 15.0,
    }
    base.update(overrides)
    return base


def test_extreme_threat_scores_high():
    """1 km asteroid passing inside 1 lunar distance must score >= 80."""
    a = base_asteroid(
        miss_distance_lunar=0.5,
        est_diameter_max_m=1000,
        velocity_kms=40,
        is_potentially_hazardous=True,
    )
    assert score_approach(a) >= 80


def test_low_threat_scores_low():
    """Tiny asteroid passing 25 lunar distances away must score < 20."""
    a = base_asteroid(
        miss_distance_lunar=25,
        est_diameter_max_m=20,
        velocity_kms=8,
    )
    assert score_approach(a) < 20


def test_hazardous_flag_increases_score():
    """Same asteroid scores higher when the NASA hazardous flag is set."""
    base = base_asteroid()
    flagged = base_asteroid(is_potentially_hazardous=True)
    assert score_approach(flagged) > score_approach(base)


def test_sentry_boost_increases_score():
    """A non-zero Sentry impact probability must increase the score."""
    a = base_asteroid()
    without = score_approach(a)
    with_sentry = score_approach(a, sentry_ip=1e-4)
    assert with_sentry > without


def test_score_clamped_to_100():
    """Score must never exceed 100 even for worst-case inputs."""
    a = base_asteroid(
        miss_distance_lunar=0.0,
        est_diameter_max_m=10000,
        velocity_kms=100,
        is_potentially_hazardous=True,
    )
    assert score_approach(a, sentry_ip=1.0) <= 100.0


def test_score_non_negative():
    """Score must never go below 0."""
    a = base_asteroid(
        miss_distance_lunar=100,
        est_diameter_max_m=0,
        velocity_kms=0,
    )
    assert score_approach(a) >= 0.0


def test_closer_approach_scores_higher():
    """Two identical asteroids — the closer one must score higher."""
    far  = base_asteroid(miss_distance_lunar=20)
    near = base_asteroid(miss_distance_lunar=2)
    assert score_approach(near) > score_approach(far)


def test_larger_diameter_scores_higher():
    """Two identical asteroids — the bigger one must score higher."""
    small = base_asteroid(est_diameter_max_m=50)
    large = base_asteroid(est_diameter_max_m=800)
    assert score_approach(large) > score_approach(small)
