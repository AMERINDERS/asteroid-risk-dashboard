# README.md
# Asteroid Risk Dashboard

A real-time full-stack web application that ingests NASA Near-Earth Object data,
computes a custom risk score for each asteroid, and presents live results through
an Angular 17 frontend with a 3D WebGL orbital visualisation.

![CI](https://github.com/YOUR_USERNAME/asteroid-risk-dashboard/actions/workflows/ci.yml/badge.svg)

## Tech Stack
- **Frontend**: Angular 17, Angular Material, Three.js, ng2-charts
- **Backend**: Python 3.12, FastAPI, SQLAlchemy
- **Database**: PostgreSQL (Neon serverless)
- **ETL**: AWS Lambda + EventBridge (daily cron)
- **CI/CD**: GitHub Actions
- **Hosting**: Vercel (frontend) + Render (backend)

## Local Setup
```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/asteroid-risk-dashboard.git
cd asteroid-risk-dashboard

# 2. Start local database and cache
docker compose up -d

# 3. Start backend
cd backend && pipenv install && pipenv run uvicorn app.main:app --reload
