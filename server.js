// server.js - Simplified Working Cloudflare Worker

const players = new Map();
let ownerId = null;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const SECRET_KEY = env.SECRET_KEY || "MewVantaIsTheBest";

    // ─── WEBSOCKET CONNECTION ───
    if (url.pathname === '/ws') {
      const upgrade = request.headers.get('Upgrade');
      if (upgrade !== 'websocket') {
        return new Response('Expected Upgrade: websocket', { status: 426 });
      }

      const webSocketPair = new WebSocketPair();
      const [client, server] = Object.values(webSocketPair);

      // Accept the WebSocket connection
      server.accept();

      console.log('✅ WebSocket connected!');

      let playerId = null;
      let playerName = 'Unknown';
      let isOwner = false;

      // ─── Handle messages ───
      server.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📩 Received:', data.type);

          if (data.type === 'player_info') {
            const info = data.data;
            playerId = info.userId || crypto.randomUUID();
            playerName = info.name || 'Unknown';
            isOwner = info.isOwner || false;

            players.set(playerId, {
              name: playerName,
              userId: playerId,
              executor: info.executor || 'Unknown',
              isOwner: isOwner,
              connectedAt: new Date().toISOString()
            });

            if (isOwner) {
              ownerId = playerId;
              console.log(`👑 OWNER connected: ${playerName}`);
            }

            console.log(`👤 Player stored: ${playerName} (${playerId})`);
            console.log(`📊 Total players: ${players.size}`);

            // ─── Send confirmation ───
            server.send(JSON.stringify({
              type: 'player_info_received',
              data: {
                message: `Welcome ${playerName}!`,
                players: getPlayerList(),
                isOwner: isOwner,
                ownerId: ownerId
              }
            }));

            return;
          }

          if (data.type === 'broadcast') {
            const from = data.data.from || playerName;
            const msg = data.data.message || 'No message';
            
            if (playerId === ownerId || isOwner) {
              // Send to all connected clients via WebSocket
              // This is a simplified version
              console.log(`📢 Broadcast from ${from}: ${msg}`);
              server.send(JSON.stringify({
                type: 'broadcast',
                data: {
                  from: '👑 ' + from + ' (Owner)',
                  message: msg,
                  timestamp: new Date().toISOString()
                }
              }));
            }
            return;
          }

          // ─── Echo back ───
          server.send(JSON.stringify({
            type: 'echo',
            data: data
          }));

        } catch (err) {
          console.log('📩 Plain message:', event.data);
          server.send(`Echo: ${event.data}`);
        }
      });

      // ─── Handle disconnect ───
      server.addEventListener('close', () => {
        if (playerId) {
          console.log(`👋 ${playerName} (${playerId}) disconnected`);
          players.delete(playerId);
          
          if (playerId === ownerId) {
            ownerId = null;
            console.log('👑 Owner disconnected');
          }

          console.log(`📊 Total players: ${players.size}`);
        }
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    // ─── API: Get Players ───
    if (url.pathname === '/api/players') {
      const list = getPlayerList();
      return new Response(JSON.stringify(list), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ─── API: Send Broadcast ───
    if (url.pathname === '/api/broadcast' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { message, password } = body;

        if (!password || password !== SECRET_KEY) {
          return new Response(JSON.stringify({ error: 'Invalid password!' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        if (!message || message.trim() === '') {
          return new Response(JSON.stringify({ error: 'Message required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        if (!ownerId) {
          return new Response(JSON.stringify({ 
            error: 'No owner connected! Start the Roblox script first.' 
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Broadcast ready!'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });

      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // ─── WEB PAGE ───
    return new Response(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>ZLFinder</title>
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
      max-width: 700px;
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
    .url-box {
      background: #0d0d1a;
      padding: 10px 16px;
      border-radius: 8px;
      margin: 10px 0 20px 0;
      border: 1px solid #2d2d44;
    }
    .url-box code { color: #fbbf24; font-size: 14px; word-break: break-all; }
    .broadcast-box {
      background: #0d0d1a;
      padding: 20px;
      border-radius: 12px;
      border: 2px solid #fbbf24;
      margin: 15px 0;
    }
    .broadcast-box h3 { color: #fbbf24; margin-bottom: 10px; }
    .password-row {
      display: flex;
      gap: 10px;
      margin-bottom: 10px;
    }
    .password-row input {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid #2d2d44;
      border-radius: 8px;
      background: #1a1a2e;
      color: #fff;
      font-size: 14px;
    }
    .password-row input:focus { border-color: #a78bfa; outline: none; }
    .password-row button {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      background: #a78bfa;
      color: #0d0d1a;
      font-weight: bold;
      font-size: 14px;
      cursor: pointer;
      transition: 0.2s;
    }
    .password-row button:hover { opacity: 0.8; }
    .broadcast-row {
      display: flex;
      gap: 10px;
    }
    .broadcast-row input {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid #2d2d44;
      border-radius: 8px;
      background: #1a1a2e;
      color: #fff;
      font-size: 14px;
    }
    .broadcast-row input:focus { border-color: #a78bfa; outline: none; }
    .broadcast-row input:disabled { opacity: 0.3; }
    .broadcast-row button {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      background: #fbbf24;
      color: #0d0d1a;
      font-weight: bold;
      font-size: 14px;
      cursor: pointer;
      transition: 0.2s;
    }
    .broadcast-row button:hover { opacity: 0.8; }
    .broadcast-row button:disabled { opacity: 0.5; cursor: not-allowed; }
    .status-msg { font-size: 12px; margin-top: 6px; color: #6b7280; }
    .status-msg.success { color: #22c55e; }
    .status-msg.error { color: #ef4444; }
    .stats {
      display: flex;
      gap: 20px;
      margin: 15px 0;
    }
    .stat-box {
      flex: 1;
      background: #0d0d1a;
      padding: 12px;
      border-radius: 10px;
      text-align: center;
      border: 1px solid #2d2d44;
    }
    .stat-box .num { font-size: 24px; font-weight: bold; color: #a78bfa; }
    .stat-box .label { font-size: 12px; color: #6b7280; }
    .players { margin-top: 15px; }
    .players h3 { color: #9ca3af; margin-bottom: 10px; font-weight: normal; }
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
    .player-card .owner-badge { color: #fbbf24; font-size: 12px; margin-left: 6px; }
    .player-card .id { color: #818cf8; font-size: 12px; }
    .player-card .executor { 
      background: #2d2d44; 
      padding: 2px 12px; 
      border-radius: 12px; 
      font-size: 11px; 
      color: #f472b6;
    }
    .empty { color: #6b7280; text-align: center; padding: 20px; }
    .footer { margin-top: 20px; font-size: 12px; color: #4b5563; text-align: center; }
    .refresh { cursor: pointer; color: #6b7280; font-size: 12px; }
    .refresh:hover { color: #a78bfa; }
    .toast {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #1a1a2e;
      padding: 16px 24px;
      border-radius: 12px;
      border: 1px solid #2d2d44;
      animation: slideIn 0.3s ease;
    }
    .toast.success { border-color: #22c55e; }
    .toast.error { border-color: #ef4444; }
    @keyframes slideIn {
      from { transform: translateX(100px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚡ ZLFinder</h1>
      <span class="status">● Online</span>
    </div>
    <div class="url-box">
      <code>wss://zlfinder-websocket.noahchico52.workers.dev/ws</code>
    </div>
    <div class="broadcast-box">
      <h3>📢 Send Broadcast</h3>
      <div class="password-row">
        <input type="password" id="passwordInput" placeholder="Enter password to unlock..." />
        <button id="unlockBtn">🔓 Unlock</button>
      </div>
      <div class="broadcast-row">
        <input type="text" id="broadcastInput" placeholder="Type your broadcast message..." disabled />
        <button id="broadcastBtn" disabled>📢 Send</button>
      </div>
      <div class="status-msg" id="statusMsg">🔒 Enter password to send broadcasts</div>
    </div>
    <div class="stats">
      <div class="stat-box">
        <div class="num" id="playerCount">0</div>
        <div class="label">👥 Players</div>
      </div>
      <div class="stat-box">
        <div class="num" id="ownerStatus">-</div>
        <div class="label">👑 Owner</div>
      </div>
    </div>
    <div class="players">
      <h3>👤 Connected Players <span class="refresh" onclick="fetchPlayers()">↻</span></h3>
      <div id="playerList"><div class="empty">No players connected</div></div>
    </div>
    <div class="footer">🔌 Connect your Roblox script to the URL above</div>
  </div>
  <div id="toastContainer"></div>
  <script>
    const passwordInput = document.getElementById('passwordInput');
    const unlockBtn = document.getElementById('unlockBtn');
    const broadcastInput = document.getElementById('broadcastInput');
    const broadcastBtn = document.getElementById('broadcastBtn');
    const statusMsg = document.getElementById('statusMsg');
    const playerCount = document.getElementById('playerCount');
    const ownerStatus = document.getElementById('ownerStatus');
    const playerList = document.getElementById('playerList');
    let isUnlocked = false;

    async function unlock() {
      const password = passwordInput.value.trim();
      if (!password) {
        showToast('❌ Please enter a password!', 'error');
        return;
      }
      unlockBtn.disabled = true;
      unlockBtn.textContent = '⏳ Checking...';
      try {
        const res = await fetch('/api/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'test', password: password })
        });
        const data = await res.json();
        if (res.status === 401) {
          showToast('❌ Invalid password!', 'error');
          statusMsg.textContent = '❌ Invalid password!';
          statusMsg.className = 'status-msg error';
          unlockBtn.disabled = false;
          unlockBtn.textContent = '🔓 Unlock';
          return;
        }
        isUnlocked = true;
        passwordInput.disabled = true;
        unlockBtn.textContent = '✅ Unlocked';
        unlockBtn.style.background = '#22c55e';
        broadcastInput.disabled = false;
        broadcastBtn.disabled = false;
        statusMsg.textContent = '✅ Unlocked! You can now send broadcasts.';
        statusMsg.className = 'status-msg success';
        showToast('✅ Unlocked successfully!', 'success');
      } catch (err) {
        showToast('❌ Error: ' + err.message, 'error');
        unlockBtn.disabled = false;
        unlockBtn.textContent = '🔓 Unlock';
      }
    }

    async function sendBroadcast() {
      if (!isUnlocked) {
        showToast('❌ Please unlock first!', 'error');
        return;
      }
      const password = passwordInput.value.trim();
      const message = broadcastInput.value.trim();
      if (!message) {
        showToast('❌ Please enter a message!', 'error');
        return;
      }
      broadcastBtn.disabled = true;
      broadcastBtn.textContent = 'Sending...';
      try {
        const res = await fetch('/api/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: message, password: password })
        });
        const data = await res.json();
        if (res.ok) {
          showToast('✅ ' + data.message, 'success');
          broadcastInput.value = '';
        } else {
          showToast('❌ ' + (data.error || 'Failed'), 'error');
        }
      } catch (err) {
        showToast('❌ Error: ' + err.message, 'error');
      }
      broadcastBtn.disabled = false;
      broadcastBtn.textContent = '📢 Send';
    }

    async function fetchPlayers() {
      try {
        const res = await fetch('/api/players');
        const data = await res.json();
        playerCount.textContent = data.length;
        const owner = data.find(p => p.isOwner);
        ownerStatus.textContent = owner ? owner.name : 'None';
        ownerStatus.style.color = owner ? '#fbbf24' : '#6b7280';
        if (data.length === 0) {
          playerList.innerHTML = '<div class="empty">No players connected</div>';
          return;
        }
        playerList.innerHTML = data.map(p => \`
          <div class="player-card \${p.isOwner ? 'owner' : ''}">
            <div>
              <span class="name">👤 \${p.name || 'Unknown'}</span>
              \${p.isOwner ? '<span class="owner-badge">👑 OWNER</span>' : ''}
              <span class="id">🆔 \${p.userId || 'Unknown'}</span>
            </div>
            <span class="executor">⚡ \${p.executor || 'Unknown'}</span>
          </div>
        \`).join('');
      } catch (err) {
        console.error('Fetch error:', err);
      }
    }

    function showToast(message, type = 'success') {
      const container = document.getElementById('toastContainer');
      const toast = document.createElement('div');
      toast.className = 'toast ' + type;
      toast.textContent = message;
      container.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }

    unlockBtn.addEventListener('click', unlock);
    passwordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') unlock();
    });
    broadcastBtn.addEventListener('click', sendBroadcast);
    broadcastInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendBroadcast();
    });

    fetchPlayers();
    setInterval(fetchPlayers, 3000);
  </script>
</body>
</html>`, {
      headers: { 'Content-Type': 'text/html; charset=UTF-8' }
    });
  }
};

// ─── Helper: Get player list ───
function getPlayerList() {
  const list = [];
  for (const [id, player] of players) {
    list.push({
      name: player.name,
      userId: player.userId,
      executor: player.executor,
      isOwner: player.isOwner || false,
      connectedAt: player.connectedAt
    });
  }
  return list;
}
