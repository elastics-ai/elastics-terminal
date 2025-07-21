FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all necessary files
COPY src/ ./src/
COPY scripts/ ./scripts/
COPY examples/ ./examples/

# Create necessary directories
RUN mkdir -p /data /tmp

# Create volume for database
VOLUME ["/data"]

# Expose WebSocket port
EXPOSE 8765

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV DB_PATH=/data/volatility_filter.db
ENV TERM=xterm-256color

# Default to running the combined filter server
CMD ["python", "scripts/run_combined_filter.py"]
