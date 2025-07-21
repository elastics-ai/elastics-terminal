# Volatility Filter Makefile

.PHONY: help install test test-python test-frontend test-e2e lint format clean docker-build docker-up docker-down docker-test

help:
	@echo "Available commands:"
	@echo "  make install        - Install all dependencies"
	@echo "  make test          - Run all tests"
	@echo "  make test-python   - Run Python tests only"
	@echo "  make test-frontend - Run frontend tests only"
	@echo "  make test-e2e      - Run end-to-end tests"
	@echo "  make lint          - Run linting checks"
	@echo "  make format        - Format code"
	@echo "  make clean         - Clean up generated files"
	@echo "  make docker-build  - Build Docker images"
	@echo "  make docker-up     - Start Docker services"
	@echo "  make docker-down   - Stop Docker services"
	@echo "  make docker-test   - Run tests in Docker"

install:
	@echo "Installing Python dependencies..."
	pip install -r requirements.txt
	@echo "Installing frontend dependencies..."
	cd volatility-web && npm install

test:
	@echo "Running all tests..."
	./scripts/run_tests.sh

test-python:
	@echo "Running Python tests..."
	python -m pytest tests/ -v --cov=src --cov-report=term-missing

test-frontend:
	@echo "Running frontend tests..."
	cd volatility-web && npm test -- --watchAll=false

test-e2e:
	@echo "Running end-to-end tests..."
	python -m pytest tests/test_e2e_chat.py -v -m e2e

lint:
	@echo "Running linting..."
	./scripts/run_tests.sh lint

format:
	@echo "Formatting Python code..."
	@if command -v black > /dev/null; then \
		black src/ tests/; \
	else \
		echo "black not installed, skipping Python formatting"; \
	fi
	@echo "Formatting frontend code..."
	cd volatility-web && npm run lint -- --fix || true

clean:
	@echo "Cleaning up..."
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "htmlcov" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "coverage" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	find . -type f -name ".coverage" -delete 2>/dev/null || true
	rm -rf volatility-web/.next 2>/dev/null || true
	rm -rf volatility-web/node_modules/.cache 2>/dev/null || true

docker-build:
	@echo "Building Docker images..."
	cd docker && docker-compose build

docker-up:
	@echo "Starting Docker services..."
	cd docker && docker-compose up -d

docker-down:
	@echo "Stopping Docker services..."
	cd docker && docker-compose down

docker-test:
	@echo "Running tests in Docker..."
	cd docker && docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit
	cd docker && docker-compose -f docker-compose.test.yml down