# Stage 1: Frontend build
FROM node:18 AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Backend build
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends curl poppler-utils && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
RUN pip install --upgrade pip && \
    pip install -r requirements.txt
COPY . .
COPY --from=frontend-builder /frontend/build /app/static
EXPOSE 5000
CMD ["python", "main.py"]