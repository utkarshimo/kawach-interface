
const express = require('express');
const dotenv = require('dotenv');
const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');

dotenv.config();

const app = express();
const port = 5123;

app.use(express.json());

const server = http.createServer(app);

// --------------------------------------------------
// In-memory node data
// --------------------------------------------------

let inMemoryData = [];

// --------------------------------------------------
// WebSocket Server
// --------------------------------------------------

const wss = new WebSocketServer({
    server,
    path: '/ws'
});

// Send current state to newly connected clients.
wss.on('connection', (ws) => {
    console.log('WebSocket client connected');

    ws.send(JSON.stringify(inMemoryData));

    ws.on('close', () => {
        console.log('WebSocket client disconnected');
    });

    ws.on('error', (err) => {
        console.error('WebSocket error:', err.message);
    });
});

// --------------------------------------------------
// Broadcast Data
// --------------------------------------------------

function broadcastData() {
    const payload = JSON.stringify(inMemoryData);

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

// --------------------------------------------------
// POST /data
// --------------------------------------------------

app.post('/data', (req, res) => {
    const apiKey = req.headers['x-api-key'];

    if (apiKey !== process.env.ESP_KEY) {
        return res.status(403).send(
            'Forbidden: Invalid API Key'
        );
    }

    // Accept both a raw array and { data: [...] }.
    const body = req.body;
    const incomingData = Array.isArray(body)
        ? body
        : body?.data;

    if (!Array.isArray(incomingData)) {
        return res.status(400).send(
            'Invalid payload: Expected an array'
        );
    }

    inMemoryData = incomingData;

    console.log('Data received:', inMemoryData);

    // Broadcast latest state to all WebSocket clients.
    broadcastData();

    res.status(200).json({
        success: true,
        message: 'Data received',
        nodes: inMemoryData.length
    });
});

// --------------------------------------------------
// GET /health
// --------------------------------------------------

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        connectedClients: wss.clients.size,
        nodes: inMemoryData.length
    });
});
// --------------------------------------------------
// INDEX DASHBOARD
// --------------------------------------------------
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});
// --------------------------------------------------
// Start Server
// --------------------------------------------------

server.listen(port, () => {
    console.log(`HTTP server: http://localhost:${port}`);
    console.log(`WebSocket:   ws://localhost:${port}/ws`);
});

server.keepAliveTimeout = 10_000;
server.headersTimeout = 11_000;
