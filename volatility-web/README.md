# volatility-web

BTC volatility monitor + portfolio tracker. Bloomberg terminal vibes.

## run

```bash
# deps
npm install
pip install -r requirements.txt

# start
npm run dev:full
```

open http://localhost:3000

## features

- **PORT** - portfolio P&L, greeks
- **FILTER** - live vol alerts  
- **VOL** - 3D surface
- **CHAT** - claude AI
- **POLY** - prediction markets

press `/` for nav

## docker

```bash
cd ../docker
docker-compose up
```

## env

```
ANTHROPIC_API_KEY=sk-xxx
```

## tech

next.js, websocket, fastapi, sqlite