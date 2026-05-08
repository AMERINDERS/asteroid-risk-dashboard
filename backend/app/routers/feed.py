import math
from datetime import date, timedelta
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import and_
from pydantic import BaseModel, ConfigDict

from app.db import get_db
from app.models.asteroid import Asteroid
from app.models.close_approach import CloseApproach
from app.services.cache import cache_get, cache_set

router = APIRouter(tags=['Feed'])

FEED_CACHE_KEY = 'api:feed:v1'
FEED_CACHE_TTL = 3600   # 1 hour


class Position3D(BaseModel):
    x: float
    y: float
    z: float


class FeedItem(BaseModel):
    neo_reference_id: str
    name: str
    approach_date: date
    miss_distance_lunar: float
    miss_distance_km: float
    velocity_kms: float
    est_diameter_min_m: float | None
    est_diameter_max_m: float | None
    is_potentially_hazardous: bool
    risk_score: float
    sentry_impact_probability: float | None
    position: Position3D   # For CesiumJS globe placement

    model_config = ConfigDict(from_attributes=True)


def compute_position(miss_lunar: float, index: int) -> Position3D:
    """
    Compute a simple 3D orbital position for CesiumJS.
    Uses Earth-centred coordinates in metres.
    Lunar distance = 384,400 km.
    """
    LUNAR_KM = 384_400.0
    r = miss_lunar * LUNAR_KM * 1000  # convert to metres
    angle = index * (2 * math.pi / 50)         # spread asteroids around the orbit
    inclination = math.radians(index * 7.3)    # vary orbital inclinations
    return Position3D(
        x=r * math.cos(angle) * math.cos(inclination),
        y=r * math.sin(angle) * math.cos(inclination),
        z=r * math.sin(inclination),
    )


@router.get('/feed', response_model=List[FeedItem])
def get_feed(db: Session = Depends(get_db)) -> List[FeedItem]:
    cached = cache_get(FEED_CACHE_KEY)
    if cached is not None:
        return cached

    today = date.today()
    limit_date = today + timedelta(days=30)

    rows = (
        db.query(CloseApproach, Asteroid)
        .join(Asteroid, CloseApproach.neo_reference_id == Asteroid.neo_reference_id)
        .filter(and_(
            CloseApproach.approach_date >= today,
            CloseApproach.approach_date <= limit_date,
        ))
        .order_by(CloseApproach.risk_score.desc())
        .limit(50)
        .all()
    )

    result = []
    for idx, (ca, ast) in enumerate(rows):
        result.append(FeedItem(
            neo_reference_id=ast.neo_reference_id,
            name=ast.name,
            approach_date=ca.approach_date,
            miss_distance_lunar=ca.miss_distance_lunar,
            miss_distance_km=ca.miss_distance_km,
            velocity_kms=ca.velocity_kms,
            est_diameter_min_m=ast.est_diameter_min_m,
            est_diameter_max_m=ast.est_diameter_max_m,
            is_potentially_hazardous=ast.is_potentially_hazardous,
            risk_score=ca.risk_score,
            sentry_impact_probability=ast.sentry_impact_probability,
            position=compute_position(ca.miss_distance_lunar, idx),
        ))
    cache_set(FEED_CACHE_KEY, [r.model_dump(mode='json') for r in result], FEED_CACHE_TTL)
    return result
