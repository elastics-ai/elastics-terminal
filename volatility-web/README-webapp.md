# Volatility Terminal Web App

A professional-grade web application for volatility monitoring and portfolio management, inspired by Bloomberg Terminal's interface. This web app preserves all functionalities from the original TUI while providing a modern, responsive interface.

## 🚀 Features

### ✅ Implemented

- **Portfolio Management (PORT)**: 
  - Real-time portfolio tracking with P&L calculations
  - Risk metrics dashboard (Delta, Gamma, Vega, Theta)
  - Position-level details with sortable columns
  - Auto-refresh every 5 seconds

- **Volatility Filter (FILTER)**: 
  - Live BTC price monitoring via WebSocket
  - Real-time volatility chart with threshold visualization
  - Alert panel for volatility breaches with timestamps
  - Historical alert tracking

- **Volatility Surface (VOL)**: 
  - Interactive 3D surface visualization using Three.js
  - Heatmap view for strike vs time-to-expiry
  - IV smile and term structure slice views
  - Market statistics panel

- **AI Chat (CHAT)**: 
  - Claude-powered portfolio analysis
  - Context-aware responses using portfolio data
  - SQL query generation capabilities
  - Markdown rendering for formatted responses
  - Dynamic question suggestions

- **Polymarket (POLY)**: 
  - Real-time prediction markets data
  - Search and filter functionality
  - Market details modal
  - Auto-refresh every 30 seconds

- **Command Bar Navigation**: 
  - Press `/` to activate
  - Quick navigation with commands: PORT, FILTER, VOL, CHAT, POLY
  - Tab completion support

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI**: Tailwind CSS, shadcn/ui, Bloomberg-style theme
- **Real-time**: Native WebSocket for live data streaming
- **State Management**: React Query, Jotai
- **Data Visualization**: Recharts, Three.js
- **Backend**: FastAPI (Python) for database access

## Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- Running WebSocket server on `ws://localhost:8765`
- SQLite database with portfolio data

## Installation

1. Install dependencies:
```bash
npm install
pip install -r requirements.txt
```

2. Start the application:
```bash
npm run dev:full
```

This will start both the Python API server (port 8000) and Next.js dev server (port 3000).

## Development

- `npm run dev` - Start Next.js dev server only
- `npm run api` - Start Python API server only
- `npm run build` - Build for production
- `npm run lint` - Run ESLint

## Navigation

- Press `/` to activate the command bar
- Type commands: PORT, FILTER, VOL, CHAT, POLY
- Use TAB for command completion
- ESC to clear/exit command mode

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8765
ANTHROPIC_API_KEY=your-api-key-here
```

## Architecture

The app follows a modular architecture:
- `/app` - Next.js App Router pages
- `/components/bloomberg` - Terminal-specific components
- `/lib` - Utilities and API clients
- `api_server.py` - FastAPI backend for database access