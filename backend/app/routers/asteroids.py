import math
from typing import List
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict

from app.db import get_db
from app.models.asteroid import Asteroid
from app.models.close_approach import CloseApproach
from app.services.risk_scorer import WEIGHTS
from app.services.cache import cache_get, cache_set

router = APIRouter(tags=['Asteroids'])

ASTEROID_CACHE_TTL = 86400   # 24 hours


class ApproachDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    approach_date: date
    miss_distance_lunar: float
    miss_distance_km: float
    velocity_kms: float
    risk_score: float


class RiskBreakdown(BaseModel):
    miss_distance_score: float
    diameter_score: float
    velocity_score: float
    hazard_flag_score: float
    sentry_bonus: float
    total: float


class AsteroidDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    neo_reference_id: str
    name: str
    is_potentially_hazardous: bool
    is_sentry_object: bool
    abs_magnitude: float | None
    est_diameter_min_m: float | None
    est_diameter_max_m: float | None
    sentry_impact_probability: float | None
    close_approaches: List[ApproachDetail]
    risk_breakdown: RiskBreakdown
    nasa_jpl_url: str


@router.get('/asteroids/{neo_id}', response_model=AsteroidDetail)
def get_asteroid(neo_id: str, db: Session = Depends(get_db)):
    cache_key = f'api:asteroid:{neo_id}:v1'
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    ast = db.query(Asteroid).filter(Asteroid.neo_reference_id == neo_id).first()
    if not ast:
        raise HTTPException(status_code=404, detail=f'Asteroid {neo_id} not found')

    approaches = (
        db.query(CloseApproach)
        .filter(CloseApproach.neo_reference_id == neo_id)
        .order_by(CloseApproach.approach_date.desc())
        .all()
    )

    latest = approaches[0] if approaches else None

    # Sentry bonus — log scale capped at 20 points
    sentry_bonus = 0.0
    if ast.sentry_impact_probability and ast.sentry_impact_probability > 0:
        sentry_bonus = round(
            min(20.0, max(0.0, ((math.log10(ast.sentry_impact_probability) + 7) / 35) * 100)), 1
        )

    breakdown = RiskBreakdown(
        miss_distance_score=round(
            max(0.0, 1.0 - (latest.miss_distance_lunar / 30.0)) * WEIGHTS['miss_distance'] * 100, 1
        ) if latest else 0.0,
        diameter_score=round(
            min(1.0, (ast.est_diameter_max_m or 0.0) / 1000.0) * WEIGHTS['diameter'] * 100, 1
        ),
        velocity_score=round(
            min(1.0, (latest.velocity_kms if latest else 0.0) / 70.0) * WEIGHTS['velocity'] * 100, 1
        ),
        hazard_flag_score=round(WEIGHTS['hazard_flag'] * 100 if ast.is_potentially_hazardous else 0.0, 1),
        sentry_bonus=sentry_bonus,
        total=latest.risk_score if latest else 0.0,
    )

    result = AsteroidDetail(
        neo_reference_id=ast.neo_reference_id,
        name=ast.name,
        is_potentially_hazardous=ast.is_potentially_hazardous,
        is_sentry_object=ast.is_sentry_object,
        abs_magnitude=ast.abs_magnitude,
        est_diameter_min_m=ast.est_diameter_min_m,
        est_diameter_max_m=ast.est_diameter_max_m,
        sentry_impact_probability=ast.sentry_impact_probability,
        close_approaches=approaches,
        risk_breakdown=breakdown,
        nasa_jpl_url=f'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr={neo_id}',
    )
    cache_set(cache_key, result.model_dump(mode='json'), ASTEROID_CACHE_TTL)
    return result
