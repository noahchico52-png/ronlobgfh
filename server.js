const express = require('express');
const { createServer } = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const app = express();
const server = createServer(app);
const port = process.env.PORT || 8080;

// ─── WebSocket Server ───
const wss = new WebSocket.Server({ server, path: '/ws' });

// ─── Config ───
const PASSWORD = "MewVantaIsTheBest";
const connectedPlayers = new Map();
const playerData = new Map();

// ─── Store server logs ───
const logs = [];

// ─── HTTP Routes ───
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Server Control</title>
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
                    padding: 20px;
                }
                .container {
                    background: #1a1a2e;
                    padding: 30px;
                    border-radius: 20px;
                    max-width: 800px;
                    width: 100%;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                }
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid #2d2d44;
                    padding-bottom: 15px;
                    margin-bottom: 20px;
                }
                h1 { color: #a78bfa; font-size: 28px; }
                .status { background: #22c55e; color: #fff; padding: 4px 16px; border-radius: 20px; font-size: 14px; }
                .stat-box {
                    background: #0d0d1a;
                    padding: 12px;
                    border-radius: 10px;
                    text-align: center;
                    border: 1px solid #2d2d44;
                    flex: 1;
                }
                .stat-box .num { font-size: 24px; font-weight: bold; color: #a78bfa; }
                .stat-box .label { font-size: 12px; color: #6b7280; }
                .stats { display: flex; gap: 20px; margin: 15px 0; }
                .players-list { margin-top: 15px; max-height: 300px; overflow-y: auto; }
                .player-card {
                    background: #0d0d1a;
                    padding: 10px 16px;
                    border-radius: 8px;
                    margin-bottom: 6px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-left: 3px solid #4ade80;
                }
                .player-card.owner { border-left-color: #fbbf24; }
                .player-card .name { color: #4ade80; font-weight: bold; }
                .player-card .id { color: #818cf8; font-size: 12px; }
                .player-card .executor { 
                    background: #2d2d44; 
                    padding: 2px 12px; 
                    border-radius: 12px; 
                    font-size: 11px; 
                    color: #f472b6;
                }
                .player-card .kick-btn {
                    background: #ef4444;
                    color: #fff;
                    border: none;
                    padding: 4px 12px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 11px;
                }
                .player-card .kick-btn:hover { opacity: 0.8; }
                .empty { color: #6b7280; text-align: center; padding: 20px; }
                .log-box {
                    background: #0d0d1a;
                    border-radius: 8px;
                    padding: 10px;
                    max-height: 150px;
                    overflow-y: auto;
                    margin-top: 15px;
                    font-size: 12px;
                    font-family: monospace;
                }
                .log-entry { padding: 2px 0; border-bottom: 1px solid #1a1a2e; }
                .log-entry .time { color: #6b7280; margin-right: 10px; }
                .log-entry .msg { color: #e0e0e0; }
                .log-entry .kick { color: #ef4444; }
                .log-entry .join { color: #22c55e; }
                .footer { margin-top: 15px; font-size: 12px; color: #4b5563; text-align: center; }
                .refresh { cursor: pointer; color: #6b7280; font-size: 12px; float: right; }
                .refresh:hover { color: #a78bfa; }
                .cmd-box {
                    margin-top: 15px;
                    display: flex;
                    gap: 10px;
                }
                .cmd-box input {
                    flex: 1;
                    padding: 10px 14px;
                    border: 1px solid #2d2d44;
                    border-radius: 8px;
                    background: #0d0d1a;
                    color: #fff;
                    font-size: 14px;
                }
                .cmd-box input:focus { border-color: #a78bfa; outline: none; }
                .cmd-box button {
                    padding: 10px 24px;
                    border: none;
                    border-radius: 8px;
                    background: #a78bfa;
                    color: #0d0d1a;
                    font-weight: bold;
                    font-size: 14px;
                    cursor: pointer;
                }
                .cmd-box button:hover { opacity: 0.8; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>⚡ Server Control</h1>
                    <span class="status" id="status">● Online</span>
                </div>

                <div class="stats">
                    <div class="stat-box">
                        <div class="num" id="playerCount">0</div>
                        <div class="label">👥 Players</div>
                    </div>
                    <div class="stat-box">
                        <div class="num" id="ownerName">-</div>
                        <div class="label">👑 Owner</div>
                    </div>
                    <div class="stat-box">
                        <div class="num" id="logCount">0</div>
                        <div class="label">📝 Logs</div>
                    </div>
                </div>

                <div class="players-list">
                    <h3 style="color: #9ca3af; margin-bottom: 10px;">👤 Connected Players <span class="refresh" onclick="fetchData()">↻</span></h3>
                    <div id="playerList"><div class="empty">No players connected</div></div>
                </div>

                <div class="cmd-box">
                    <input type="text" id="cmdInput" placeholder="Command: kick [player] or list" />
                    <button id="cmdBtn">Send</button>
                </div>

                <div class="log-box" id="logBox">
                    <div class="log-entry"><span class="time">[Server]</span><span class="msg">Server started</span></div>
                </div>

                <div class="footer">🔒 Password Protected: <span id="passwordDisplay">MewVantaIsTheBest</span></div>
            </div>

            <script>
                async function fetchData() {
                    try {
                        const res = await fetch('/api/data');
                        const data = await res.json();
                        
                        document.getElementById('playerCount').textContent = data.players.length;
                        document.getElementById('ownerName').textContent = data.ownerName || 'None';
                        document.getElementById('logCount').textContent = data.logs.length;
                        
                        const list = document.getElementById('playerList');
                        if (data.players.length === 0) {
                            list.innerHTML = '<div class="empty">No players connected</div>';
                            return;
                        }
                        
                        list.innerHTML = data.players.map(p => \`
                            <div class="player-card \${p.isOwner ? 'owner' : ''}">
                                <div>
                                    <span class="name">👤 \${p.name}</span>
                                    \${p.isOwner ? '<span style="color: #fbbf24; font-size: 12px;">👑 OWNER</span>' : ''}
                                    <span class="id">🆔 \${p.userId}</span>
                                    <span class="executor">⚡ \${p.executor}</span>
                                </div>
                                <button class="kick-btn" onclick="kickPlayer('\${p.name}')">Kick</button>
                            </div>
                        \`).join('');
                        
                        // Update logs
                        const logBox = document.getElementById('logBox');
                        logBox.innerHTML = data.logs.slice(-20).map(log => \`
                            <div class="log-entry">
                                <span class="time">[\${log.time}]</span>
                                <span class="msg \${log.type}">\${log.message}</span>
                            </div>
                        \`).join('');
                        logBox.scrollTop = logBox.scrollHeight;
                        
                    } catch (err) {
                        console.error('Fetch error:', err);
                    }
                }

                async function kickPlayer(name) {
                    if (!confirm(\`Kick player: \${name}?\`)) return;
                    try {
                        const res = await fetch('/api/kick', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ playerName: name, password: prompt('Enter password:') })
                        });
                        const data = await res.json();
                        alert(data.message || (res.ok ? '✅ Kicked!' : '❌ Failed'));
                        fetchData();
                    } catch (err) {
                        alert('Error: ' + err.message);
                    }
                }

                document.getElementById('cmdBtn').addEventListener('click', async () => {
                    const input = document.getElementById('cmdInput');
                    const text = input.value.trim();
                    if (!text) return;
                    
                    const parts = text.split(' ');
                    const cmd = parts[0].toLowerCase();
                    
                    if (cmd === 'kick' && parts[1]) {
                        await kickPlayer(parts[1]);
                    } else if (cmd === 'list') {
                        await fetchData();
                    } else {
                        alert('Commands: kick [player], list');
                    }
                    input.value = '';
                });

                document.getElementById('cmdInput').addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') document.getElementById('cmdBtn').click();
                });

                fetchData();
                setInterval(fetchData, 3000);
            </script>
        </body>
        </html>
    `);
});

// ─── API: Get data ───
app.get('/api/data', (req, res) => {
    const players = [];
    for (const [id, data] of playerData) {
        players.push({
            name: data.name || 'Unknown',
            userId: id,
            executor: data.executor || 'Unknown',
            isOwner: data.isOwner || false
        });
    }
    
    // Sort: owner first, then by name
    players.sort((a, b) => {
        if (a.isOwner) return -1;
        if (b.isOwner) return 1;
        return a.name.localeCompare(b.name);
    });
    
    const owner = players.find(p => p.isOwner);
    
    res.json({
        players: players,
        ownerName: owner ? owner.name : null,
        logs: logs.slice(-50)
    });
});

// ─── API: Kick player ───
app.post('/api/kick', (req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
        try {
            const data = JSON.parse(body);
            const { playerName, password } = data;
            
            if (!password || password !== PASSWORD) {
                return res.json({ success: false, message: 'Invalid password!' });
            }
            
            if (!playerName) {
                return res.json({ success: false, message: 'Player name required!' });
            }
            
            // Find player in connected clients
            let targetWs = null;
            let targetId = null;
            for (const [id, ws] of connectedPlayers) {
                const pData = playerData.get(id);
                if (pData && pData.name === playerName) {
                    targetWs = ws;
                    targetId = id;
                    break;
                }
            }
            
            if (!targetWs) {
                return res.json({ success: false, message: `Player "${playerName}" not found!` });
            }
            
            // Send kick message to client
            targetWs.send(JSON.stringify({
                type: 'kick',
                data: {
                    message: 'You have been kicked by the server owner!'
                }
            }));
            
            // Close connection after short delay
            setTimeout(() => {
                if (targetWs.readyState === WebSocket.OPEN) {
                    targetWs.close();
                }
            }, 500);
            
            addLog(`👢 Kicked: ${playerName}`, 'kick');
            
            res.json({ success: true, message: `✅ Kicked: ${playerName}` });
            
        } catch (err) {
            res.json({ success: false, message: 'Error: ' + err.message });
        }
    });
});

// ─── WebSocket Logic ───
wss.on('connection', (ws) => {
    const clientId = crypto.randomUUID ? crypto.randomUUID() : Date.now() + '_' + Math.random();
    connectedPlayers.set(clientId, ws);
    
    console.log(`✅ Client connected: ${clientId}`);
    addLog(`👤 Client connected: ${clientId}`, 'join');
    
    let playerName = 'Unknown';
    let isOwner = false;
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('📩 Received:', data.type);
            
            if (data.type === 'player_info') {
                const info = data.data;
                playerName = info.name || 'Unknown';
                isOwner = info.isOwner || false;
                
                playerData.set(clientId, {
                    name: playerName,
                    userId: info.userId || clientId,
                    executor: info.executor || 'Unknown',
                    isOwner: isOwner,
                    connectedAt: new Date().toISOString()
                });
                
                if (isOwner) {
                    console.log(`👑 OWNER connected: ${playerName}`);
                    addLog(`👑 Owner connected: ${playerName}`, 'join');
                } else {
                    addLog(`👤 Player joined: ${playerName}`, 'join');
                }
                
                // Send confirmation
                ws.send(JSON.stringify({
                    type: 'player_info_received',
                    data: {
                        message: `Welcome ${playerName}!`,
                        isOwner: isOwner
                    }
                }));
                
                broadcastUpdate();
                return;
            }
            
            // ─── Handle kick command from client ───
            if (data.type === 'kick') {
                if (!isOwner) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        data: { message: 'Only the owner can kick players!' }
                    }));
                    return;
                }
                
                const targetName = data.data.playerName;
                kickPlayerByName(targetName, ws);
                return;
            }
            
            // ─── Handle server info request ───
            if (data.type === 'server_info') {
                const players = getPlayerList();
                ws.send(JSON.stringify({
                    type: 'server_info',
                    data: {
                        players: players,
                        totalPlayers: players.length,
                        owner: getOwnerName()
                    }
                }));
                return;
            }
            
            // ─── Handle list request ───
            if (data.type === 'list_players') {
                const players = getPlayerList();
                ws.send(JSON.stringify({
                    type: 'player_list',
                    data: { players: players }
                }));
                return;
            }
            
        } catch (err) {
            console.log('📩 Plain message:', message.toString());
        }
    });
    
    ws.on('close', () => {
        console.log(`❌ Client disconnected: ${playerName}`);
        addLog(`👋 Player left: ${playerName}`, 'leave');
        
        connectedPlayers.delete(clientId);
        playerData.delete(clientId);
        broadcastUpdate();
    });
});

// ─── Helper: Kick player by name ───
function kickPlayerByName(name, senderWs) {
    let targetId = null;
    let targetWs = null;
    
    for (const [id, ws] of connectedPlayers) {
        const pData = playerData.get(id);
        if (pData && pData.name === name) {
            targetId = id;
            targetWs = ws;
            break;
        }
    }
    
    if (!targetWs) {
        if (senderWs) {
            senderWs.send(JSON.stringify({
                type: 'error',
                data: { message: `Player "${name}" not found!` }
            }));
        }
        return;
    }
    
    // Send kick message to target
    targetWs.send(JSON.stringify({
        type: 'kick',
        data: {
            message: 'You have been kicked by the server owner!'
        }
    }));
    
    // Close connection
    setTimeout(() => {
        if (targetWs.readyState === WebSocket.OPEN) {
            targetWs.close();
        }
    }, 500);
    
    addLog(`👢 Kicked: ${name}`, 'kick');
    
    if (senderWs) {
        senderWs.send(JSON.stringify({
            type: 'kick_success',
            data: { message: `✅ Kicked: ${name}` }
        }));
    }
    
    broadcastUpdate();
}

// ─── Helper: Get player list ───
function getPlayerList() {
    const players = [];
    for (const [id, data] of playerData) {
        players.push({
            name: data.name || 'Unknown',
            userId: data.userId || id,
            executor: data.executor || 'Unknown',
            isOwner: data.isOwner || false
        });
    }
    players.sort((a, b) => {
        if (a.isOwner) return -1;
        if (b.isOwner) return 1;
        return a.name.localeCompare(b.name);
    });
    return players;
}

// ─── Helper: Get owner name ───
function getOwnerName() {
    for (const [id, data] of playerData) {
        if (data.isOwner) return data.name;
    }
    return null;
}

// ─── Helper: Broadcast update ───
function broadcastUpdate() {
    const data = JSON.stringify({
        type: 'update',
        data: {
            players: getPlayerList(),
            owner: getOwnerName()
        }
    });
    
    for (const [id, ws] of connectedPlayers) {
        if (ws.readyState === WebSocket.OPEN) {
            try {
                ws.send(data);
            } catch (err) {}
        }
    }
}

// ─── Helper: Add log ───
function addLog(message, type = 'info') {
    const time = new Date().toLocaleTimeString();
    logs.push({ time, message, type });
    if (logs.length > 100) logs.shift();
    console.log(`[${time}] ${message}`);
}

// ─── Start Server ───
server.listen(port, () => {
    console.log(`✅ Server running on port ${port}`);
    console.log(`📍 WebSocket URL: ws://localhost:${port}/ws`);
    console.log(`📍 Web UI: http://localhost:${port}`);
    console.log(`🔒 Password: ${PASSWORD}`);
});
