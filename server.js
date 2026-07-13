// server.js - Cloudflare Worker

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ─── WebSocket ───
    if (url.pathname === '/ws') {
      const upgrade = request.headers.get('Upgrade');
      if (upgrade !== 'websocket') {
        return new Response('Expected Upgrade: websocket', { status: 426 });
      }

      const [client, server] = Object.values(new WebSocketPair());
      server.accept();

      console.log('✅ Client connected!');

      server.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📩 Received:', data.type);
          
          if (data.type === 'player_info') {
            console.log('👤 Player:', data.data.name);
            server.send(JSON.stringify({
              type: 'player_info_received',
              data: { message: 'Welcome ' + data.data.name + '!' }
            }));
          }
        } catch (err) {
          console.log('📩 Plain:', event.data);
        }
      });

      server.addEventListener('close', () => {
        console.log('❌ Client disconnected');
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    // ─── Web Page ───
    return new Response(`<!DOCTYPE html>
<html>
<head>
  <title>Server Control</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0d0d1a; color: #e0e0e0; font-family: Arial; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .container { background: #1a1a2e; padding: 30px; border-radius: 20px; max-width: 600px; width: 100%; }
    h1 { color: #a78bfa; }
    .status { background: #22c55e; color: #fff; padding: 4px 16px; border-radius: 20px; display: inline-block; }
    .player-card { background: #0d0d1a; padding: 10px; border-radius: 8px; margin: 5px 0; display: flex; justify-content: space-between; }
    .kick-btn { background: #ef4444; color: #fff; border: none; padding: 4px 12px; border-radius: 6px; cursor: pointer; }
    .empty { color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <h1>⚡ Server Control</h1>
    <p><span class="status">● Online</span></p>
    <p>📍 WebSocket: <code>wss://zlfinder-websocket.noahchico52.workers.dev/ws</code></p>
    <h3>👤 Connected Players</h3>
    <div id="playerList"><div class="empty">No players connected</div></div>
  </div>
  <script>
    setInterval(async () => {
      try {
        const res = await fetch('/api/players');
        const data = await res.json();
        const list = document.getElementById('playerList');
        if (data.length === 0) {
          list.innerHTML = '<div class="empty">No players connected</div>';
          return;
        }
        list.innerHTML = data.map(p => \`
          <div class="player-card">
            <span>👤 \${p.name}</span>
            <span>\${p.executor || 'Unknown'}</span>
          </div>
        \`).join('');
      } catch(e) {}
    }, 3000);
  </script>
</body>
</html>`, {
      headers: { 'Content-Type': 'text/html; charset=UTF-8' }
    });
  }
};
