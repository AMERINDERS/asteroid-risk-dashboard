from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from pydantic import BaseModel

from app.db import get_db
from app.models.asteroid import Asteroid
from app.models.close_approach import CloseApproach
from app.services.cache import cache_get, cache_set

router = APIRouter(tags=['Stats'])

STATS_CACHE_KEY = 'api:stats:v1'
STATS_CACHE_TTL = 21600   # 6 hours


class DashboardStats(BaseModel):
    total_tracked: int
    total_hazardous: int
    closest_this_week_lunar: float | None
    closest_this_week_name: str | None
    avg_risk_score: float


@router.get('/stats', response_model=DashboardStats)
def get_stats(db: Session = Depends(get_db)):
    cached = cache_get(STATS_CACHE_KEY)
    if cached is not None:
        return cached

    total     = db.query(func.count(Asteroid.neo_reference_id)).scalar() or 0
    hazardous = db.query(func.count(Asteroid.neo_reference_id)).filter(
        Asteroid.is_potentially_hazardous == True
    ).scalar() or 0
    avg_risk  = db.query(func.avg(CloseApproach.risk_score)).scalar() or 0.0

    today    = date.today()
    week_end = today + timedelta(days=7)
    closest  = (
        db.query(CloseApproach, Asteroid)
        .join(Asteroid)
        .filter(and_(
            CloseApproach.approach_date >= today,
            CloseApproach.approach_date <= week_end,
        ))
        .order_by(CloseApproach.miss_distance_lunar.asc())
        .first()
    )

    result = DashboardStats(
        total_tracked=total,
        total_hazardous=hazardous,
        closest_this_week_lunar=closest[0].miss_distance_lunar if closest else None,
        closest_this_week_name=closest[1].name if closest else None,
        avg_risk_score=round(float(avg_risk), 1),
    )
    cache_set(STATS_CACHE_KEY, result.model_dump(), STATS_CACHE_TTL)
    return result
