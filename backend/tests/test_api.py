"""
API integration tests — uses FastAPI TestClient against the real local Postgres.
Docker must be running before executing these tests.
Run: pipenv run pytest tests/test_api.py -v
"""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


# ── Health ────────────────────────────────────────────────────────────────────

def test_health_check():
    r = client.get('/')
    assert r.status_code == 200
    assert r.json()['status'] == 'ok'
    assert r.json()['service'] == 'asteroid-risk-api'


# ── Feed ──────────────────────────────────────────────────────────────────────

def test_feed_returns_200():
    r = client.get('/api/feed')
    assert r.status_code == 200
    assert r.headers['content-type'].startswith('application/json')


def test_feed_returns_list():
    r = client.get('/api/feed')
    assert isinstance(r.json(), list)


def test_feed_items_have_required_fields():
    r = client.get('/api/feed')
    data = r.json()
    if data:
        item = data[0]
        for field in ('neo_reference_id', 'name', 'approach_date',
                      'miss_distance_lunar', 'risk_score', 'is_potentially_hazardous'):
            assert field in item, f'Missing field: {field}'


def test_feed_items_have_position_for_cesium():
    """Every feed item must carry a position object for CesiumJS globe placement."""
    r = client.get('/api/feed')
    data = r.json()
    if data:
        pos = data[0]['position']
        assert 'x' in pos
        assert 'y' in pos
        assert 'z' in pos


def test_feed_sorted_by_risk_score_desc():
    r = client.get('/api/feed')
    scores = [item['risk_score'] for item in r.json()]
    assert scores == sorted(scores, reverse=True)


# ── Stats ─────────────────────────────────────────────────────────────────────

def test_stats_returns_200():
    r = client.get('/api/stats')
    assert r.status_code == 200


def test_stats_has_required_fields():
    r = client.get('/api/stats')
    data = r.json()
    assert 'total_tracked' in data
    assert 'total_hazardous' in data
    assert 'avg_risk_score' in data


def test_stats_values_are_non_negative():
    r = client.get('/api/stats')
    data = r.json()
    assert data['total_tracked'] >= 0
    assert data['total_hazardous'] >= 0
    assert data['avg_risk_score'] >= 0


# ── Historical ────────────────────────────────────────────────────────────────

def test_historical_returns_200():
    r = client.get('/api/historical')
    assert r.status_code == 200


def test_historical_returns_at_most_12_months():
    r = client.get('/api/historical')
    assert len(r.json()) <= 12


def test_historical_month_format():
    r = client.get('/api/historical')
    for row in r.json():
        assert 'month' in row
        assert len(row['month']) == 7   # 'YYYY-MM'
        assert row['month'][4] == '-'


# ── Asteroid detail ───────────────────────────────────────────────────────────

def test_asteroid_404_for_unknown_id():
    r = client.get('/api/asteroids/FAKE_ID_DOES_NOT_EXIST')
    assert r.status_code == 404
    assert 'detail' in r.json()


def test_asteroid_detail_returns_real_asteroid():
    feed = client.get('/api/feed').json()
    if not feed:
        return   # no data — skip gracefully
    neo_id = feed[0]['neo_reference_id']
    r = client.get(f'/api/asteroids/{neo_id}')
    assert r.status_code == 200
    data = r.json()
    assert data['neo_reference_id'] == neo_id
    assert 'close_approaches' in data
    assert isinstance(data['close_approaches'], list)


def test_asteroid_detail_has_risk_breakdown():
    feed = client.get('/api/feed').json()
    if not feed:
        return
    neo_id = feed[0]['neo_reference_id']
    r = client.get(f'/api/asteroids/{neo_id}')
    breakdown = r.json()['risk_breakdown']
    for field in ('miss_distance_score', 'diameter_score', 'velocity_score',
                  'hazard_flag_score', 'sentry_bonus', 'total'):
        assert field in breakdown, f'Missing breakdown field: {field}'


def test_asteroid_detail_has_nasa_jpl_url():
    feed = client.get('/api/feed').json()
    if not feed:
        return
    neo_id = feed[0]['neo_reference_id']
    r = client.get(f'/api/asteroids/{neo_id}')
    url = r.json()['nasa_jpl_url']
    assert url.startswith('https://ssd.jpl.nasa.gov')
    assert neo_id in url


# ── Trajectory ────────────────────────────────────────────────────────────────

def test_trajectory_404_for_unknown_id():
    r = client.get('/api/asteroids/FAKE_ID/trajectory')
    assert r.status_code == 404


def test_trajectory_returns_100_points():
    feed = client.get('/api/feed').json()
    if not feed:
        return
    neo_id = feed[0]['neo_reference_id']
    r = client.get(f'/api/asteroids/{neo_id}/trajectory')
    assert r.status_code == 200
    assert len(r.json()['points']) == 100


def test_trajectory_points_have_correct_shape():
    feed = client.get('/api/feed').json()
    if not feed:
        return
    neo_id = feed[0]['neo_reference_id']
    r = client.get(f'/api/asteroids/{neo_id}/trajectory')
    point = r.json()['points'][0]
    assert 'timestamp' in point
    assert 'x' in point
    assert 'y' in point
    assert 'z' in point


def test_trajectory_has_orbital_period():
    feed = client.get('/api/feed').json()
    if not feed:
        return
    neo_id = feed[0]['neo_reference_id']
    r = client.get(f'/api/asteroids/{neo_id}/trajectory')
    assert r.json()['orbital_period_seconds'] > 0


# ── CORS ─────────────────────────────────────────────────────────────────────

def test_cors_headers_present_for_angular_origin():
    r = client.get('/api/feed', headers={'Origin': 'http://localhost:4200'})
    assert 'access-control-allow-origin' in r.headers
