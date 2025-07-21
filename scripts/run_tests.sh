#!/bin/bash
# Run all tests for the volatility filter project

set -e  # Exit on error

echo "🧪 Running Volatility Filter Tests..."
echo "====================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run Python tests
run_python_tests() {
    echo -e "\n${YELLOW}Running Python Backend Tests...${NC}"
    
    # Make sure we're in the project root
    cd "$(dirname "$0")/.."
    
    # Run pytest with coverage
    if python -m pytest tests/ -v --cov=src --cov-report=term-missing --cov-report=html; then
        echo -e "${GREEN}✓ Python tests passed${NC}"
    else
        echo -e "${RED}✗ Python tests failed${NC}"
        exit 1
    fi
}

# Function to run JavaScript/TypeScript tests
run_frontend_tests() {
    echo -e "\n${YELLOW}Running Frontend Tests...${NC}"
    
    # Change to frontend directory
    cd volatility-web
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing frontend dependencies..."
        npm install
    fi
    
    # Run Jest tests
    if npm test -- --passWithNoTests; then
        echo -e "${GREEN}✓ Frontend tests passed${NC}"
    else
        echo -e "${RED}✗ Frontend tests failed${NC}"
        exit 1
    fi
    
    cd ..
}

# Function to run linting
run_linting() {
    echo -e "\n${YELLOW}Running Linting Checks...${NC}"
    
    # Python linting with ruff (if available)
    if command -v ruff &> /dev/null; then
        echo "Running Python linting..."
        if ruff check src/ tests/; then
            echo -e "${GREEN}✓ Python linting passed${NC}"
        else
            echo -e "${RED}✗ Python linting failed${NC}"
            exit 1
        fi
    fi
    
    # Frontend linting
    echo "Running Frontend linting..."
    cd volatility-web
    if npm run lint; then
        echo -e "${GREEN}✓ Frontend linting passed${NC}"
    else
        echo -e "${RED}✗ Frontend linting failed${NC}"
        exit 1
    fi
    cd ..
}

# Function to run type checking
run_type_checking() {
    echo -e "\n${YELLOW}Running Type Checking...${NC}"
    
    # Python type checking with mypy (if available)
    if command -v mypy &> /dev/null; then
        echo "Running Python type checking..."
        if mypy src/ --ignore-missing-imports; then
            echo -e "${GREEN}✓ Python type checking passed${NC}"
        else
            echo -e "${YELLOW}⚠ Python type checking warnings${NC}"
        fi
    fi
    
    # TypeScript checking is done by Next.js build
    echo "TypeScript checking is performed during build"
}

# Main execution
main() {
    echo "Starting test suite..."
    
    # Check if running specific test type
    if [ "$1" == "python" ]; then
        run_python_tests
    elif [ "$1" == "frontend" ]; then
        run_frontend_tests
    elif [ "$1" == "lint" ]; then
        run_linting
    elif [ "$1" == "type" ]; then
        run_type_checking
    else
        # Run all tests
        run_python_tests
        run_frontend_tests
        run_linting
        # run_type_checking  # Optional, uncomment if you want type checking in CI
    fi
    
    echo -e "\n${GREEN}✨ All tests passed successfully!${NC}"
    
    # Show coverage report location
    echo -e "\n📊 Coverage reports:"
    echo "   Python: htmlcov/index.html"
    echo "   Frontend: volatility-web/coverage/lcov-report/index.html"
}

# Run main function with all arguments
main "$@"