from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel

from app.db import get_db
from app.services.cache import cache_get, cache_set

router = APIRouter(tags=['Historical'])

HISTORICAL_CACHE_KEY = 'api:historical:v1'
HISTORICAL_CACHE_TTL = 43200   # 12 hours


class MonthlyData(BaseModel):
    month: str          # e.g. '2025-10'
    flyby_count: int
    avg_risk_score: float


@router.get('/historical', response_model=List[MonthlyData])
def get_historical(db: Session = Depends(get_db)):
    cached = cache_get(HISTORICAL_CACHE_KEY)
    if cached is not None:
        return cached

    rows = db.execute(text("""
        SELECT
            TO_CHAR(approach_date, 'YYYY-MM')   AS month,
            COUNT(*)                             AS flyby_count,
            ROUND(AVG(risk_score)::numeric, 1)  AS avg_risk_score
        FROM close_approaches
        WHERE approach_date >= NOW() - INTERVAL '12 months'
        GROUP BY month
        ORDER BY month DESC
        LIMIT 12
    """)).fetchall()

    result = [
        MonthlyData(
            month=r.month,
            flyby_count=r.flyby_count,
            avg_risk_score=float(r.avg_risk_score),
        )
        for r in rows
    ]
    cache_set(HISTORICAL_CACHE_KEY, [r.model_dump() for r in result], HISTORICAL_CACHE_TTL)
    return result
