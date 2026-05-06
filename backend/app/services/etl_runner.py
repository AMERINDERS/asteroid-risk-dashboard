from datetime import date, timedelta

from app.db import SessionLocal
from app.services.neows_fetcher import fetch_neows_feed
from app.services.sentry_fetcher import fetch_sentry_objects
from app.services.risk_scorer import score_approach
from app.services.upserter import upsert_asteroids_and_approaches
from app.services.s3_archiver import archive_raw


def run_etl(window_days: int = 7) -> dict:
    """
    Run the full ETL pipeline once. Returns a summary dict.
    Safe to call repeatedly — idempotent.
    """
    today = date.today()
    end = today + timedelta(days=window_days)

    # 1. Fetch NeoWs feed
    items = fetch_neows_feed(start_date=today, end_date=end)
    print(f'NeoWs returned {len(items)} approaches.')

    # 2. Fetch Sentry watchlist
    sentry_map = fetch_sentry_objects()
    print(f'Sentry returned {len(sentry_map)} objects.')

    # 3. Enrich each item with Sentry probability + computed risk score
    for it in items:
        ip = sentry_map.get(it['neo_reference_id'])
        it['sentry_impact_probability'] = ip
        it['risk_score'] = score_approach(it, sentry_ip=ip)

    # 4. Archive raw inputs to S3 (best-effort — never fail the ETL on archive error)
    try:
        archive_raw('neows', items)
        archive_raw('sentry', sentry_map)
    except Exception as e:
        print(f'Warning: S3 archive skipped — {e}')

    # 5. Upsert to Postgres
    db = SessionLocal()
    try:
        upsert_asteroids_and_approaches(db, items)
    finally:
        db.close()

    summary = {
        'approaches_processed': len(items),
        'sentry_objects_seen':  len(sentry_map),
        'window_days':          window_days,
        'start_date':           today.isoformat(),
        'end_date':             end.isoformat(),
    }
    print('ETL complete:', summary)
    return summary


if __name__ == '__main__':
    run_etl()
