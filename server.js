const express = require('express');
const { createServer } = require('http');
const WebSocket = require('ws');

const app = express();
const server = createServer(app);
const port = process.env.PORT || 10000;

// WebSocket server on /ws path
const wss = new WebSocket.Server({ server, path: '/ws' });

// HTTP route
app.get('/', (req, res) => {
    res.send('WebSocket server is running!');
});

// Health check (keeps Render happy)
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// WebSocket logic
wss.on('connection', (ws) => {
    console.log('✅ Client connected!');
    
    ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to ZLFinder server!'
    }));
    
    ws.on('message', (message) => {
        console.log('📩 Received:', message.toString());
        // Echo back
        ws.send(message);
    });
    
    ws.on('close', () => {
        console.log('❌ Client disconnected');
    });
});

server.listen(port, () => {
    console.log(`✅ Server running on port ${port}`);
    console.log(`📍 WebSocket URL: wss://your-service-name.onrender.com/ws`);
});
