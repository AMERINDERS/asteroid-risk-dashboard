from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv(dotenv_path='../.env')

app = FastAPI(
    title='Asteroid Risk Dashboard API',
    description='Real-time NASA near-Earth object data with custom risk scoring.',
    version='1.0.0',
    docs_url='/docs',
    redoc_url='/redoc',
)

# ── CORS ─────────────────────────────────────────────────────────────────────
# Angular dev server runs on localhost:4200
# Production Vercel URL added in Phase 5
ALLOWED_ORIGINS = [
    'http://localhost:4200',
    'http://localhost:4201',
    os.getenv('FRONTEND_URL', ''),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in ALLOWED_ORIGINS if o],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# ── ROUTERS ──────────────────────────────────────────────────────────────────
from app.routers import feed, asteroids, stats, historical, trajectory

app.include_router(feed.router,       prefix='/api')
app.include_router(asteroids.router,  prefix='/api')
app.include_router(stats.router,      prefix='/api')
app.include_router(historical.router, prefix='/api')
app.include_router(trajectory.router, prefix='/api')

# ── HEALTH CHECK ─────────────────────────────────────────────────────────────
@app.get('/', tags=['health'])
def health_check():
    return {'status': 'ok', 'service': 'asteroid-risk-api'}
