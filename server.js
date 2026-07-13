// server.js - Cloudflare Worker with Kick Support

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
      let playerName = 'Unknown';
      let isOwner = false;

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
              connectedAt: new Date().toISOString(),
              ws: server
            });

            console.log(`👤 Player stored: ${playerName}`);
            console.log(`📊 Total players: ${players.size}`);

            server.send(JSON.stringify({
              type: 'player_info_received',
              data: {
                message: `Welcome ${playerName}!`,
                players: getPlayerList()
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
      const list = getPlayerList();
      return new Response(JSON.stringify(list), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ─── API: KICK PLAYER ───
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
          console.log(`👢 Sent kick to: ${targetName}`);
        } catch (err) {
          console.error('Failed to send kick:', err);
        }

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

    // ─── WEB PAGE WITH KICK BUTTON ───
    return new Response(`<!DOCTYPE html>
<html>
<head>
  <title>Server Control</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0d0d1a; color: #e0e0e0; font-family: Arial; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
    .container { background: #1a1a2e; padding: 30px; border-radius: 20px; max-width: 600px; width: 100%; }
    h1 { color: #a78bfa; }
    .status { background: #22c55e; color: #fff; padding: 4px 16px; border-radius: 20px; display: inline-block; }
    .url-box { background: #0d0d1a; padding: 10px; border-radius: 8px; margin: 10px 0; border: 1px solid #2d2d44; }
    .url-box code { color: #fbbf24; }
    .player { background: #0d0d1a; padding: 10px; border-radius: 8px; margin: 5px 0; display: flex; justify-content: space-between; align-items: center; border-left: 3px solid #4ade80; }
    .player .kick-btn { background: #ef4444; color: #fff; border: none; padding: 4px 12px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: bold; }
    .player .kick-btn:hover { opacity: 0.8; }
    .empty { color: #6b7280; text-align: center; padding: 20px; }
    .stats { display: flex; gap: 20px; margin: 15px 0; }
    .stat-box { background: #0d0d1a; padding: 12px; border-radius: 10px; text-align: center; border: 1px solid #2d2d44; flex: 1; }
    .stat-box .num { font-size: 24px; font-weight: bold; color: #a78bfa; }
    .stat-box .label { font-size: 12px; color: #6b7280; }
    .footer { margin-top: 20px; font-size: 12px; color: #4b5563; text-align: center; }
    .toast {
      position: fixed; top: 20px; right: 20px; background: #1a1a2e; padding: 16px 24px; border-radius: 12px; border: 1px solid #2d2d44; animation: slideIn 0.3s ease; z-index: 999;
    }
    .toast.success { border-color: #22c55e; }
    .toast.error { border-color: #ef4444; }
    @keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
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

    <div id="playerList"><div class="empty">No players connected</div></div>
    <div class="footer">🔌 Connect your Roblox script to the URL above</div>
  </div>

  <div id="toastContainer"></div>

  <script>
    const PASSWORD = "MewVantaIsTheBest";

    async function fetchPlayers() {
      try {
        const res = await fetch('/api/players');
        const data = await res.json();
        document.getElementById('playerCount').textContent = data.length;
        const owner = data.find(p => p.isOwner);
        document.getElementById('ownerStatus').textContent = owner ? owner.name : 'None';
        document.getElementById('ownerStatus').style.color = owner ? '#fbbf24' : '#6b7280';

        const list = document.getElementById('playerList');
        if (data.length === 0) {
          list.innerHTML = '<div class="empty">No players connected</div>';
          return;
        }
        list.innerHTML = data.map(p => \`
          <div class="player">
            <span>👤 \${p.name} \${p.isOwner ? '👑' : ''} 🆔 \${p.userId} ⚡ \${p.executor}</span>
            <button class="kick-btn" onclick="kickPlayer('\${p.name}')">Kick</button>
          </div>
        \`).join('');
      } catch(e) { console.error(e); }
    }

    async function kickPlayer(name) {
      if (!confirm(\`Kick player: \${name}?\`)) return;
      const password = prompt('Enter password:');
      if (!password) return;

      try {
        const res = await fetch('/api/kick', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName: name, password: password })
        });
        const data = await res.json();
        showToast(data.message || (res.ok ? '✅ Kicked!' : '❌ Failed'), res.ok ? 'success' : 'error');
        fetchPlayers();
      } catch(e) {
        showToast('❌ Error: ' + e.message, 'error');
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

    fetchPlayers();
    setInterval(fetchPlayers, 3000);
  </script>
</body>
</html>`, {
      headers: { 'Content-Type': 'text/html; charset=UTF-8' }
    });
  }
};

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
