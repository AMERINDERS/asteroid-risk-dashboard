from typing import List, Dict, Any

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.models.asteroid import Asteroid
from app.models.close_approach import CloseApproach


def upsert_asteroids_and_approaches(
    db: Session,
    items: List[Dict[str, Any]],
) -> None:
    """
    Upsert asteroids and insert their close-approach rows.
    'items' is the output of fetch_neows_feed, with risk_score and
    sentry_impact_probability already added by the ETL runner.
    Safe to call repeatedly — idempotent via ON CONFLICT DO UPDATE.
    """
    asteroid_rows = []
    approach_rows = []
    seen_asteroid_ids: set = set()

    for it in items:
        # One asteroid row per unique neo_reference_id
        if it['neo_reference_id'] not in seen_asteroid_ids:
            asteroid_rows.append({
                'neo_reference_id':          it['neo_reference_id'],
                'name':                      it['name'],
                'is_potentially_hazardous':  it['is_potentially_hazardous'],
                'is_sentry_object':          it['is_sentry_object'],
                'abs_magnitude':             it.get('abs_magnitude'),
                'est_diameter_min_m':        it['est_diameter_min_m'],
                'est_diameter_max_m':        it['est_diameter_max_m'],
                'sentry_impact_probability': it.get('sentry_impact_probability'),
            })
            seen_asteroid_ids.add(it['neo_reference_id'])

        approach_rows.append({
            'neo_reference_id':    it['neo_reference_id'],
            'approach_date':       it['approach_date'],
            'miss_distance_km':    it['miss_distance_km'],
            'miss_distance_lunar': it['miss_distance_lunar'],
            'velocity_kms':        it['velocity_kms'],
            'risk_score':          it['risk_score'],
        })

    # Upsert asteroids — update all fields if the row already exists
    if asteroid_rows:
        stmt = pg_insert(Asteroid).values(asteroid_rows)
        update_cols = {
            c.name: c
            for c in stmt.excluded
            if c.name != 'neo_reference_id'
        }
        stmt = stmt.on_conflict_do_update(
            index_elements=['neo_reference_id'],
            set_=update_cols,
        )
        db.execute(stmt)

    # Upsert approaches on (neo_reference_id, approach_date) — idempotent re-runs
    if approach_rows:
        stmt = pg_insert(CloseApproach).values(approach_rows)
        update_cols = {
            c.name: c
            for c in stmt.excluded
            if c.name not in ('id', 'neo_reference_id', 'approach_date', 'created_at')
        }
        stmt = stmt.on_conflict_do_update(
            constraint='uq_approach_asteroid_date',
            set_=update_cols,
        )
        db.execute(stmt)

    db.commit()
