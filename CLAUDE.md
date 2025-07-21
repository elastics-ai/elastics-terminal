# Project Guidelines

## Deployment
- **ALWAYS use Docker deployment** - Never install packages directly on the host system
- All dependencies should be managed through Docker containers
- Use docker-compose for multi-service deployments
- Build and run everything inside Docker containers

## Recent Fixes
- Fixed database cursor error in portfolio_manager.py (was using wrong column name)
- Updated Claude API model from claude-3-sonnet-20240229 to claude-3-5-sonnet-20241022
- Added proper cleanup for asyncio event loops
- Unified chat UI with light theme to match app styling
- Integrated GlitchTip error tracking for monitoring production errors

## Architecture
- Backend: Python FastAPI with WebSocket support
- Frontend: Next.js with TypeScript
- Database: SQLite
- WebSocket server on port 8765
- API server on port 8000
- Web app on port 3000
- GlitchTip on port 8080 (internal)

## Error Tracking (GlitchTip)
- GlitchTip is configured for error tracking and performance monitoring
- Access GlitchTip dashboard: Internal only (via container network)
- DSN is configured in docker/.env as GLITCHTIP_DSN
- Default admin credentials: admin@localhost / admin123
- Sentry SDK is integrated in both WebSocket server and API server
- Test error endpoint available at: /api/test-error