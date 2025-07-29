# Elastics Platform: Technical Stack Overview

## 1. Philosophy

Elastics is engineered on a modern, cloud-native foundation, prioritizing high-performance, deterministic trading workflows, and seamless AI-driven orchestration. Our technology choices reflect a commitment to type-safety, scalability, and a robust developer experience, enabling rapid iteration while maintaining system stability.

---

## 2. Backend Services

The backend is predominantly a Python ecosystem, leveraging asynchronous capabilities for efficient I/O and CPU-bound performance for quantitative analysis.

*   **Core Framework**: **FastAPI** is the backbone of our API services. Its asynchronous nature (built on Starlette and ASGI) provides high throughput for handling concurrent client requests and WebSocket connections. Pydantic integration ensures strict data validation and serialization, crucial for financial data integrity.

*   **Quantitative & Data Science Stack**:
    *   **NumPy & SciPy**: The foundation for numerical and scientific computing, used for statistical calculations, and algorithmic components.
    *   **Pandas**: The primary tool for time-series analysis, data manipulation, and cleaning of market data.
    *   **scikit-learn & statsmodels**: Utilized for statistical modeling, backtesting components, and implementing machine learning-driven filters.

*   **Asynchronous Operations**: We use `aiohttp` and `httpx` for building efficient, non-blocking external API clients to fetch data from various financial sources.

---

## 3. AI & Machine Learning Layer

The AI layer is designed to be modular, allowing for integration with various Large Language Models (LLMs) and providing sophisticated data retrieval and analysis capabilities.

*   **LLM Integration**: The system currently integrates with **Anthropic's Claude** via its official Python SDK. This powers features like natural language queries, report generation, and chat-based analysis. The architecture is designed to be LLM-agnostic.

*   **Orchestration Pipeline**: While not explicitly visible in dependencies, the architecture suggests a **Retrieval-Augmented Generation (RAG)** pipeline. This pattern is common for providing LLMs with up-to-date, proprietary context from our data stores for more accurate and relevant responses.

---

## 4. Frontend Application (Elastics Terminal)

The user interface is a sophisticated web application built with a modern TypeScript and React-based stack, focusing on real-time data visualization and interactivity.

*   **Core Framework**: **Next.js 15** provides the structure for our React-based application, enabling server-side rendering (SSR) for fast initial loads and a powerful routing system.

*   **Language**: **TypeScript** is used throughout the frontend codebase to ensure type-safety, which is critical for preventing common errors in a complex financial application.

*   **Styling**: **Tailwind CSS** is our utility-first CSS framework of choice, allowing for rapid and consistent UI development.

*   **Real-time Communication**: **Socket.IO** is used to establish persistent WebSocket connections with the backend, enabling real-time streaming of market data, portfolio updates, and notifications.

*   **Data & State Management**:
    *   **TanStack Query (React Query)**: Manages server-state, handling data fetching, caching, and synchronization with our backend APIs.
    *   **Jotai**: A primitive and flexible atomic state management library for handling global client-side state.

*   **Data Visualization**:
    *   **Recharts & Chart.js**: Used for creating a wide range of 2D charts and plots for financial data visualization.
    *   **Plotly.js**: Leveraged for more complex and interactive scientific charts.
    *   **React Flow (@xyflow/react)**: Powers interactive node-based editors and diagrams, likely for visualizing trading strategies or data flows.

*   **3D Graphics**: **Three.js** and its React ecosystem (`@react-three/fiber`, `@react-three/drei`) are included for advanced 3D visualizations, potentially for plotting volatility surfaces or complex portfolio landscapes.

---

## 5. Data Storage

Our data layer is designed for a mix of structured, unstructured, and cached data to ensure performance and scalability.

*   **Primary Database**: The presence of `volatility_filter.db` and `aiosqlite` in the web app's dependencies suggests the use of **SQLite** for local development and testing. The original documentation specifies **PostgreSQL** as the production database, a powerful and reliable object-relational database suitable for storing structured data like trade records, user information, and configuration.

*   **Caching Layer**: **Redis** is mentioned as the caching solution. It is likely used for caching frequently accessed market data, session information, and intermediate results from complex calculations to reduce latency.

*   **Object Storage**: An **S3-compatible object store** is noted for storing large, unstructured data objects such as generated reports, historical data archives, and model artifacts.

---

## 6. DevOps, Testing, and Deployment

The platform is built for containerized deployments and adheres to modern CI/CD practices.

*   **Containerization**: **Docker** is used extensively. The presence of multiple Dockerfiles (`Dockerfile`, `Dockerfile.mocks`, `Dockerfile.webapp`) and `docker-compose.yml` files indicates a microservices-oriented architecture tailored for development, testing, and production environments.

*   **CI/CD**: The `.github/workflows/tests.yml` file indicates the use of **GitHub Actions** for continuous integration, automatically running tests on push and pull requests.

*   **Testing**:
    *   **Backend**: **Pytest** is the testing framework for Python services, with plugins like `pytest-asyncio` for testing asynchronous code and `pytest-cov` for measuring code coverage.
    *   **Frontend**: **Jest** and **React Testing Library** are used for unit and integration testing of React components, while **Playwright** is used for end-to-end testing to simulate user interactions in a real browser.

*   **Cloud Infrastructure**: The platform is primarily designed for **AWS**, but with stated compatibility for **GCP** and **Azure**, reflecting a flexible, multi-cloud strategy.