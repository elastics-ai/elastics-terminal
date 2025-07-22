const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 9000;

app.use(cors());
app.use(bodyParser.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Mock API endpoints - catch all /api routes
app.use('/api', (req, res) => {
  const delay = parseInt(process.env.MOCK_DELAY_MS || '0');
  setTimeout(() => {
    if (req.method === 'GET') {
      res.json({ 
        mock: true, 
        path: req.path,
        timestamp: new Date().toISOString()
      });
    } else if (req.method === 'POST') {
      res.json({ 
        mock: true, 
        path: req.path,
        body: req.body,
        timestamp: new Date().toISOString()
      });
    } else {
      res.json({ 
        mock: true, 
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    }
  }, delay);
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Mock server listening at http://0.0.0.0:${port}`);
});