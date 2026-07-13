const express = require('express');
const { createServer } = require('http');
const WebSocket = require('ws');

const app = express();
const server = createServer(app);
const port = process.env.PORT || 10000;

const wss = new WebSocket.Server({ server, path: '/ws' });

// ─── Store connected players ───
const connectedPlayers = [];

// ─── HTML Page ───
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
                .players {
                    margin-top: 20px;
                    background: #1a1a2e;
                    padding: 15px 25px;
                    border-radius: 8px;
                    width: 400px;
                    max-height: 200px;
                    overflow-y: auto;
                }
                .players h3 { color: #a78bfa; margin-bottom: 10px; }
                .players .player {
                    padding: 4px 0;
                    border-bottom: 1px solid #2d2d44;
                    font-size: 13px;
                }
                .players .player .name { color: #4ade80; }
                .players .player .id { color: #818cf8; }
                .players .player .executor { color: #f472b6; }
                .count { color: #fbbf24; font-weight: bold; }
            </style>
        </head>
        <body>
            <h1>⚡ ZLFinder WebSocket Server</h1>
            <p>✅ Server is <span class="status">running</span></p>
            <p>📍 WebSocket URL: <code>wss://nlfinder.onrender.com/ws</code></p>
            
            <div class="players">
                <h3>👥 Connected Players (<span class="count" id="playerCount">0</span>)</h3>
                <div id="playerList"></div>
            </div>
            
            <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
                This server handles WebSocket connections for ZLFinder.
            </p>

            <script>
                // Auto-refresh player list every 5 seconds
                function updatePlayers() {
                    fetch('/players')
                        .then(res => res.json())
                        .then(data => {
                            document.getElementById('playerCount').textContent = data.count;
                            const list = document.getElementById('playerList');
                            list.innerHTML = data.players.map(p => 
                                '<div class="player">' +
                                '👤 <span class="name">' + p.name + '</span> ' +
                                '🆔 <span class="id">' + p.userId + '</span> ' +
                                '⚡ <span class="executor">' + (p.executor || 'Unknown') + '</span>' +
                                '</div>'
                            ).join('');
                        });
                }
                updatePlayers();
                setInterval(updatePlayers, 5000);
            </script>
        </body>
        </html>
    `);
});

// ─── API to get connected players ───
app.get('/players', (req, res) => {
    res.json({
        count: connectedPlayers.length,
        players: connectedPlayers
    });
});

// ─── Health Check ───
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// ─── WebSocket Logic ───
wss.on('connection', (ws) => {
    console.log('✅ Client connected!');
    
    // Add to connected players list
    const playerInfo = {
        name: 'Unknown',
        userId: 'Unknown',
        executor: 'Unknown',
        connectedAt: new Date().toISOString()
    };
    connectedPlayers.push(playerInfo);
    
    // Send welcome message
    ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to ZLFinder server!'
    }));
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('📩 Received:', data);
            
            // ─── Check for player info ───
            if (data.type === 'player_info') {
                // Update the player's info
                const info = data.data;
                const idx = connectedPlayers.indexOf(playerInfo);
                if (idx !== -1) {
                    connectedPlayers[idx] = {
                        name: info.name || 'Unknown',
                        userId: info.userId || 'Unknown',
                        executor: info.executor || 'Unknown',
                        connectedAt: info.connectedAt || new Date().toISOString()
                    };
                    console.log(`👤 Player: ${info.name} (${info.userId}) - Executor: ${info.executor}`);
                }
                
                // Broadcast to all clients that a player joined
                wss.clients.forEach(client => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: 'player_joined',
                            data: {
                                name: info.name,
                                userId: info.userId,
                                executor: info.executor
                            }
                        }));
                    }
                });
                
                // Send back confirmation
                ws.send(JSON.stringify({
                    type: 'player_info_received',
                    data: { 
                        message: `Player ${info.name} registered!`,
                        timestamp: Date.now()
                    }
                }));
            }
            
            // ─── Echo back other messages ───
            else {
                ws.send(JSON.stringify({
                    type: 'echo',
                    data: data
                }));
            }
            
        } catch (err) {
            // Plain text message
            console.log('📩 Plain:', message.toString());
            ws.send(`Echo: ${message}`);
        }
    });
    
    ws.on('close', () => {
        console.log('❌ Client disconnected');
        // Remove from connected players
        const idx = connectedPlayers.indexOf(playerInfo);
        if (idx !== -1) {
            const removed = connectedPlayers.splice(idx, 1)[0];
            console.log(`👋 ${removed.name || 'Unknown'} disconnected`);
        }
    });
});

// ─── Start Server ───
server.listen(port, () => {
    console.log(`✅ Server running on port ${port}`);
    console.log(`📍 WebSocket URL: wss://nlfinder.onrender.com/ws`);
});
