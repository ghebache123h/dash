FROM python:3.11-slim

WORKDIR /app

COPY analytics/dashboard/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY analytics/dashboard /app

ENV PYTHONUNBUFFERED=1

CMD ["streamlit", "run", "app.py", "--server.address=0.0.0.0", "--server.port=8501"]
