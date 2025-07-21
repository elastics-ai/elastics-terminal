# volatility-filter

BTC/ETH options volatility monitoring. Web app + WebSocket API.

## quick start

```bash
cd docker
docker-compose up
```

open http://localhost:3001

## features

- realtime vol surface
- portfolio tracking  
- threshold alerts
- claude AI chat
- polymarket integration

## structure

```
/volatility-web    # next.js web app
/src              # python vol engine
/docker           # containers
```

## api

- websocket: `ws://localhost:8765`
- rest: `http://localhost:8000`
- web: `http://localhost:3001`
