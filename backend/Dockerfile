FROM python:3.11-slim

# Create non-root user for security
RUN useradd --create-home appuser

WORKDIR /home/appuser/app

# Install dependencies first (cached layer — only rebuilds when Pipfile changes)
COPY Pipfile Pipfile.lock ./
RUN pip install pipenv && pipenv install --system --deploy

# Copy application code (changes more often — comes after deps for layer caching)
COPY . .

# Switch to non-root user
USER appuser

# Document the port
EXPOSE 8000

# Health check — Render uses this to know the app is ready
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/')" || exit 1

# Start the server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
