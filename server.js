const express = require('express');
const { createServer } = require('http');
const WebSocket = require('ws');

const app = express();
const server = createServer(app);
const port = process.env.PORT || 10000;

// WebSocket server on /ws path
const wss = new WebSocket.Server({ server, path: '/ws' });

// ─── HTTP ROUTE (Your HTML page) ───
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>ZLFinder Server</title>
            <style>
                body { 
                    background: #0d0d1a; 
                    color: #e0e0e0; 
                    font-family: Arial, sans-serif; 
                    display: flex; 
                    justify-content: center; 
                    align-items: center; 
                    height: 100vh; 
                    margin: 0; 
                    flex-direction: column;
                }
                h1 { color: #a78bfa; }
                p { color: #9ca3af; }
                .status { color: #22c55e; }
                code { background: #1a1a2e; padding: 4px 8px; border-radius: 4px; }
            </style>
        </head>
        <body>
            <h1>⚡ ZLFinder WebSocket Server</h1>
            <p>✅ Server is <span class="status">running</span></p>
            <p>📍 WebSocket URL: <code>wss://nlfinder.onrender.com/ws</code></p>
            <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
                This server handles WebSocket connections for ZLFinder.
            </p>
        </body>
        </html>
    `);
});

// ─── HEALTH CHECK (keeps Render happy) ───
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// ─── WEBSOCKET LOGIC ───
wss.on('connection', (ws) => {
    console.log('✅ Client connected!');
    
    // Send welcome message
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

// ─── START SERVER ───
server.listen(port, () => {
    console.log(`✅ Server running on port ${port}`);
    console.log(`📍 WebSocket URL: wss://nlfinder.onrender.com/ws`);
});
