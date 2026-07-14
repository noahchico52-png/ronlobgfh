const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 8080 });

console.log('✅ WebSocket server running on ws://localhost:8080');

server.on('connection', (ws) => {
    console.log('✅ Client connected!');
    
    ws.on('message', (message) => {
        console.log('📩 Received:', message.toString());
        ws.send(`Echo: ${message}`);
    });
    
    ws.send('Welcome to the WebSocket server!');
});
