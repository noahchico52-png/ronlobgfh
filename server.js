// server.js - Simple Working Version (Player Tracking Only)

const players = new Map();

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ─── WEBSOCKET CONNECTION ───
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

      server.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📩 Received:', data.type);

          if (data.type === 'player_info') {
            const info = data.data;
            playerId = info.userId || crypto.randomUUID();
            playerName = info.name || 'Unknown';

            // ─── STORE PLAYER ───
            players.set(playerId, {
              name: playerName,
              userId: playerId,
              executor: info.executor || 'Unknown',
              isOwner: info.isOwner || false,
              connectedAt: new Date().toISOString()
            });

            console.log(`👤 Player stored: ${playerName} (${playerId})`);
            console.log(`📊 Total players: ${players.size}`);

            // ─── Send confirmation ───
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
          console.log(`👋 ${playerName} (${playerId}) disconnected`);
          players.delete(playerId);
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

    // ─── WEB PAGE ───
    return new Response(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Server Control</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0d0d1a; color: #e0e0e0; font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
    .container { background: #1a1a2e; padding: 30px; border-radius: 20px; max-width: 600px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #2d2d44; padding-bottom: 15px; margin-bottom: 20px; }
    h1 { color: #a78bfa; font-size: 28px; }
    .status { background: #22c55e; color: #fff; padding: 4px 16px; border-radius: 20px; font-size: 14px; }
    .url-box { background: #0d0d1a; padding: 10px 16px; border-radius: 8px; margin: 10px 0 20px 0; border: 1px solid #2d2d44; }
    .url-box code { color: #fbbf24; font-size: 14px; word-break: break-all; }
    .stats { display: flex; gap: 20px; margin: 15px 0; }
    .stat-box { background: #0d0d1a; padding: 12px; border-radius: 10px; text-align: center; border: 1px solid #2d2d44; flex: 1; }
    .stat-box .num { font-size: 24px; font-weight: bold; color: #a78bfa; }
    .stat-box .label { font-size: 12px; color: #6b7280; }
    .players { margin-top: 15px; }
    .player-card { background: #0d0d1a; padding: 10px 16px; border-radius: 8px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; border-left: 3px solid #4ade80; }
    .player-card .name { color: #4ade80; font-weight: bold; }
    .player-card .id { color: #818cf8; font-size: 12px; }
    .player-card .executor { background: #2d2d44; padding: 2px 12px; border-radius: 12px; font-size: 11px; color: #f472b6; }
    .empty { color: #6b7280; text-align: center; padding: 20px; }
    .footer { margin-top: 20px; font-size: 12px; color: #4b5563; text-align: center; }
    .refresh { cursor: pointer; color: #6b7280; font-size: 12px; }
    .refresh:hover { color: #a78bfa; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚡ Server Control</h1>
      <span class="status">● Online</span>
    </div>

    <div class="url-box">
      <code>wss://zlfinder-websocket.noahchico52.workers.dev/ws</code>
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

  <script>
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
          <div class="player-card">
            <div>
              <span class="name">👤 \${p.name || 'Unknown'}</span>
              \${p.isOwner ? '<span style="color: #fbbf24; font-size: 12px;">👑 OWNER</span>' : ''}
              <span class="id">🆔 \${p.userId || 'Unknown'}</span>
            </div>
            <span class="executor">⚡ \${p.executor || 'Unknown'}</span>
          </div>
        \`).join('');
      } catch (err) {
        console.error('Fetch error:', err);
      }
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
