FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY backend-fastapi/requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY backend-fastapi/app ./app

# Landing page static files
RUN mkdir -p ./static/assets ./static/downloads
COPY docs/index.html ./static/index.html
COPY docs/assets/ ./static/assets/
COPY docs/downloads/ ./static/downloads/
RUN echo "=== static contents ===" && ls -R ./static/

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
