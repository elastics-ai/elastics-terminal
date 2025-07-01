FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/ ./src/
COPY scripts/ ./scripts/

# Create volume for database
VOLUME ["/data"]

# Expose WebSocket port
EXPOSE 8765

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV DB_PATH=/data/volatility_filter.db

# Run the filter
CMD ["python", "scripts/run_filter.py"]