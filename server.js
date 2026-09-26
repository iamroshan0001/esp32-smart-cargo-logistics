const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.csv': 'text/csv',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.ino': 'text/plain'
};

// In-Memory Real-Time Telemetry Storage for ESP32 Live Stream
let latestTelemetry = {
  temp: 27.7,
  hum: 45.0,
  gas: 1450,
  motion: 1.02,
  accelX: 0.0,
  accelY: 0.0,
  accelZ: 9.81,
  source: 'SYSTEM_STANDBY',
  lastUpdated: new Date().toISOString()
};

const server = http.createServer((req, res) => {
  // CORS Headers for ESP32 and Web Browsers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. ESP32 Direct HTTP Telemetry Ingestion Endpoint
  if (req.method === 'POST' && req.url === '/api/telemetry') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        latestTelemetry = {
          temp: parseFloat(data.temp || data.temperature || 27.7),
          hum: parseFloat(data.hum || data.humidity || 45.0),
          gas: parseInt(data.gas || data.rawGasValue || 1450),
          motion: parseFloat(data.motion || data.totalAcceleration || 1.02),
          accelX: parseFloat(data.accelX || 0),
          accelY: parseFloat(data.accelY || 0),
          accelZ: parseFloat(data.accelZ || 9.81),
          source: 'ESP32_WIFI_DIRECT',
          lastUpdated: new Date().toISOString()
        };
        console.log(`[ESP32 STREAM] Live Telemetry Received: Temp=${latestTelemetry.temp}°C, Hum=${latestTelemetry.hum}%, Gas=${latestTelemetry.gas}PPM, Motion=${latestTelemetry.motion}G`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Telemetry received successfully', timestamp: latestTelemetry.lastUpdated }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  // 2. Dashboard Real-Time Telemetry Retrieval Endpoint
  if (req.method === 'GET' && req.url === '/api/telemetry') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(latestTelemetry));
    return;
  }

  // 3. Arduino CLI Compile Endpoint
  if (req.method === 'POST' && req.url === '/api/compile') {
    exec('arduino-cli compile --fqbn esp32:esp32:esp32 .', { cwd: PUBLIC_DIR }, (error, stdout, stderr) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      if (error) {
        res.end(JSON.stringify({ success: false, output: stderr || stdout || error.message }));
      } else {
        res.end(JSON.stringify({ success: true, output: stdout || 'Build completed successfully.' }));
      }
    });
    return;
  }

  // 4. Serve Static Files
  let reqUrl = req.url.split('?')[0];
  let filePath = path.join(PUBLIC_DIR, reqUrl === '/' ? 'index.html' : reqUrl);
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`, 'utf-8');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` ESP32 Smart Cargo Logistics Edge AI & Real-Time Server`);
  console.log(` Web Dashboard: http://localhost:${PORT}`);
  console.log(` Live Telemetry POST API: http://localhost:${PORT}/api/telemetry`);
  console.log(` AI Dataset CSV: http://localhost:${PORT}/cargo_sensor_dataset.csv`);
  console.log(`=======================================================`);
});
