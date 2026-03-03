FROM python:3.11-slim

WORKDIR /app

COPY analytics/api/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY analytics/api /app
COPY analytics/db/migrations /app/db/migrations

ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
