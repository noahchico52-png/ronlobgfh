const express = require('express');
const { createServer } = require('http');
const WebSocket = require('ws');

const app = express();
const server = createServer(app);
const port = process.env.PORT || 3000; // Railway uses 3000 by default

const wss = new WebSocket.Server({ server, path: '/ws' });

// ─── Store connected players ───
const connectedPlayers = [];

// ─── HTML Page with Boxed Player Cards ───
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>ZLFinder Server</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    background: #0d0d1a; 
                    color: #e0e0e0; 
                    font-family: 'Segoe UI', Arial, sans-serif; 
                    display: flex; 
                    justify-content: center; 
                    align-items: center; 
                    min-height: 100vh; 
                    margin: 0; 
                    flex-direction: column;
                    padding: 20px;
                }
                .container {
                    max-width: 600px;
                    width: 100%;
                }
                h1 { 
                    color: #a78bfa; 
                    font-size: 28px;
                    text-align: center;
                    margin-bottom: 8px;
                }
                .subtitle { 
                    color: #9ca3af; 
                    text-align: center;
                    font-size: 14px;
                    margin-bottom: 20px;
                }
                .status { color: #22c55e; }
                code { 
                    background: #1a1a2e; 
                    padding: 4px 10px; 
                    border-radius: 4px; 
                    font-size: 13px;
                    color: #a78bfa;
                }
                .players {
                    margin-top: 24px;
                    background: #1a1a2e;
                    padding: 20px 24px;
                    border-radius: 12px;
                    border: 1px solid #2d2d44;
                }
                .players h3 { 
                    color: #a78bfa; 
                    margin-bottom: 14px;
                    font-size: 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .count { 
                    color: #fbbf24; 
                    font-weight: bold;
                    background: #2d2d44;
                    padding: 2px 12px;
                    border-radius: 12px;
                    font-size: 14px;
                }
                .player-card {
                    background: #0d0d1a;
                    padding: 12px 16px;
                    border-radius: 8px;
                    border-left: 4px solid #a78bfa;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                    transition: all 0.2s;
                }
                .player-card:hover {
                    border-left-color: #4ade80;
                    background: #14142a;
                }
                .player-card:last-child {
                    margin-bottom: 0;
                }
                .player-info {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .player-name {
                    font-weight: bold;
                    color: #4ade80;
                    font-size: 15px;
                }
                .player-id {
                    font-size: 12px;
                    color: #818cf8;
                }
                .player-executor {
                    background: #2d2d44;
                    padding: 4px 14px;
                    border-radius: 20px;
                    font-size: 12px;
                    color: #f472b6;
                    font-weight: 600;
                    white-space: nowrap;
                }
                .empty-message {
                    color: #6b7280;
                    text-align: center;
                    padding: 20px 0;
                    font-size: 14px;
                }
                .footer {
                    margin-top: 20px;
                    font-size: 13px;
                    color: #6b7280;
                    text-align: center;
                }
                .refresh-note {
                    font-size: 11px;
                    color: #4b5563;
                    text-align: right;
                    margin-top: 10px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>⚡ ZLFinder</h1>
                <p class="subtitle">✅ Server <span class="status">running</span> · 📍 <code>wss://nlfinder.onrender.com/ws</code></p>
                
                <div class="players">
                    <h3>
                        👥 Connected Players
                        <span class="count" id="playerCount">0</span>
                    </h3>
                    <div id="playerList">
                        <div class="empty-message">No players connected yet</div>
                    </div>
                    <div class="refresh-note">🔄 Auto-refreshes every 5 seconds</div>
                </div>
                
                <div class="footer">
                    This server handles WebSocket connections for ZLFinder.
                </div>
            </div>

            <script>
                function updatePlayers() {
                    fetch('/players')
                        .then(res => res.json())
                        .then(data => {
                            document.getElementById('playerCount').textContent = data.count;
                            const list = document.getElementById('playerList');
                            
                            if (data.players.length === 0) {
                                list.innerHTML = '<div class="empty-message">No players connected yet</div>';
                                return;
                            }
                            
                            list.innerHTML = data.players.map(p => `
                                <div class="player-card">
                                    <div class="player-info">
                                        <div class="player-name">👤 ${p.name || 'Unknown'}</div>
                                        <div class="player-id">🆔 ${p.userId || 'Unknown'}</div>
                                    </div>
                                    <div class="player-executor">⚡ ${p.executor || 'Unknown'}</div>
                                </div>
                            `).join('');
                        })
                        .catch(() => {
                            // Silently fail if server not ready
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
    
    const playerInfo = {
        name: 'Unknown',
        userId: 'Unknown',
        executor: 'Unknown',
        connectedAt: new Date().toISOString()
    };
    connectedPlayers.push(playerInfo);
    
    ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to ZLFinder server!'
    }));
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('📩 Received:', data);
            
            if (data.type === 'player_info') {
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
                
                ws.send(JSON.stringify({
                    type: 'player_info_received',
                    data: { 
                        message: `Player ${info.name} registered!`,
                        timestamp: Date.now()
                    }
                }));
            } else {
                ws.send(JSON.stringify({
                    type: 'echo',
                    data: data
                }));
            }
            
        } catch (err) {
            console.log('📩 Plain:', message.toString());
            ws.send(`Echo: ${message}`);
        }
    });
    
    ws.on('close', () => {
        console.log('❌ Client disconnected');
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
