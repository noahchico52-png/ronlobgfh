const players = new Map();

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/ws') {
      const upgrade = request.headers.get('Upgrade');
      if (upgrade !== 'websocket') {
        return new Response('Expected Upgrade: websocket', { status: 426 });
      }

      const [client, server] = Object.values(new WebSocketPair());
      server.accept();
      let playerId = null;

      server.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'player_info') {
            const info = data.data;
            playerId = info.userId || crypto.randomUUID();
            players.set(playerId, {
              name: info.name || 'Unknown',
              userId: playerId,
              executor: info.executor || 'Unknown',
              isOwner: info.isOwner || false,
              connectedAt: new Date().toISOString()
            });
            server.send(JSON.stringify({ type: 'player_info_received', data: { message: `Welcome ${info.name}!` } }));
          }
        } catch (err) { console.log('Plain message:', event.data); }
      });

      server.addEventListener('close', () => { if (playerId) players.delete(playerId); });
      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === '/api/players') {
      const list = Array.from(players.values());
      return new Response(JSON.stringify(list), { headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(`<!DOCTYPE html>
<html>
<head><title>Server Control</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0d0d1a; color: #e0e0e0; font-family: Arial; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
  .container { background: #1a1a2e; padding: 30px; border-radius: 20px; max-width: 600px; width: 100%; }
  h1 { color: #a78bfa; }
  .status { background: #22c55e; color: #fff; padding: 4px 16px; border-radius: 20px; display: inline-block; }
  .url-box { background: #0d0d1a; padding: 10px; border-radius: 8px; margin: 10px 0; border: 1px solid #2d2d44; }
  .url-box code { color: #fbbf24; }
  .player { background: #0d0d1a; padding: 10px; border-radius: 8px; margin: 5px 0; display: flex; justify-content: space-between; border-left: 3px solid #4ade80; }
  .empty { color: #6b7280; text-align: center; padding: 20px; }
  .stats { display: flex; gap: 20px; margin: 15px 0; }
  .stat-box { background: #0d0d1a; padding: 12px; border-radius: 10px; text-align: center; border: 1px solid #2d2d44; flex: 1; }
  .stat-box .num { font-size: 24px; font-weight: bold; color: #a78bfa; }
  .stat-box .label { font-size: 12px; color: #6b7280; }
  .footer { margin-top: 20px; font-size: 12px; color: #4b5563; text-align: center; }
</style>
</head>
<body>
<div class="container">
  <h1>⚡ Server Control</h1>
  <p><span class="status">● Online</span></p>
  <div class="url-box"><code>wss://zlfinder-player-tracker.noahchico52.workers.dev/ws</code></div>
  <div class="stats">
    <div class="stat-box"><div class="num" id="playerCount">0</div><div class="label">👥 Players</div></div>
    <div class="stat-box"><div class="num" id="ownerStatus">-</div><div class="label">👑 Owner</div></div>
  </div>
  <div id="playerList"><div class="empty">No players connected</div></div>
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
      const list = document.getElementById('playerList');
      if (data.length === 0) { list.innerHTML = '<div class="empty">No players connected</div>'; return; }
      list.innerHTML = data.map(p => \`
        <div class="player"><span>👤 \${p.name} \${p.isOwner ? '👑' : ''}</span><span style="color:#818cf8;">🆔 \${p.userId}</span><span style="background:#2d2d44;padding:2px 12px;border-radius:12px;color:#f472b6;">⚡ \${p.executor}</span></div>
      \`).join('');
    } catch(e) { console.error(e); }
  }
  fetchPlayers();
  setInterval(fetchPlayers, 3000);
</script>
</body>
</html>`, { headers: { 'Content-Type': 'text/html; charset=UTF-8' } });
  }
};
