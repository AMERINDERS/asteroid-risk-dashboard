import math
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db import get_db
from app.models.asteroid import Asteroid
from app.models.close_approach import CloseApproach
from app.services.cache import cache_get, cache_set

router = APIRouter(tags=['Trajectory'])

TRAJECTORY_CACHE_TTL = 86400   # 24 hours

LUNAR_KM = 384_400.0    # km per lunar distance
EARTH_GM = 3.986e14     # Earth gravitational parameter (m³/s²)
SAMPLES  = 100


class TrajectoryPoint(BaseModel):
    timestamp: str   # ISO 8601 — what Cesium SampledPositionProperty expects
    x: float
    y: float
    z: float


class TrajectoryResponse(BaseModel):
    neo_reference_id: str
    name: str
    points: List[TrajectoryPoint]
    orbital_period_seconds: float


@router.get('/asteroids/{neo_id}/trajectory', response_model=TrajectoryResponse)
def get_trajectory(neo_id: str, db: Session = Depends(get_db)):
    cache_key = f'api:trajectory:{neo_id}:v1'
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    ast = db.query(Asteroid).filter(Asteroid.neo_reference_id == neo_id).first()
    if not ast:
        raise HTTPException(status_code=404, detail=f'Asteroid {neo_id} not found')

    approach = (
        db.query(CloseApproach)
        .filter(CloseApproach.neo_reference_id == neo_id)
        .order_by(CloseApproach.risk_score.desc())
        .first()
    )
    if not approach:
        raise HTTPException(status_code=404, detail='No approach data found')

    # Orbital radius in metres
    r = approach.miss_distance_lunar * LUNAR_KM * 1000

    # Orbital period from vis-viva equation (circular orbit)
    period_s = 2 * math.pi * math.sqrt(r ** 3 / EARTH_GM)

    # Consistent but unique inclination/phase per asteroid based on its ID
    seed         = sum(ord(c) for c in neo_id)
    inclination  = math.radians((seed % 45) + 5)       # 5–50 degree inclination
    phase_offset = math.radians((seed * 7) % 360)      # unique starting phase

    now    = datetime.utcnow()
    points = []
    for i in range(SAMPLES):
        t     = i * (period_s / SAMPLES)
        angle = phase_offset + (2 * math.pi * t / period_s)
        x     = r * math.cos(angle)
        y     = r * math.sin(angle) * math.cos(inclination)
        z     = r * math.sin(angle) * math.sin(inclination)
        ts    = (now + timedelta(seconds=t)).strftime('%Y-%m-%dT%H:%M:%SZ')
        points.append(TrajectoryPoint(timestamp=ts, x=x, y=y, z=z))

    result = TrajectoryResponse(
        neo_reference_id=neo_id,
        name=ast.name,
        points=points,
        orbital_period_seconds=period_s,
    )
    cache_set(cache_key, result.model_dump(), TRAJECTORY_CACHE_TTL)
    return result
