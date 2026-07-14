// server.js - ULTRA SIMPLE TEST
// Just echoes back anything sent to it

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ─── WEBSOCKET ───
    if (url.pathname === '/ws') {
      const upgrade = request.headers.get('Upgrade');
      if (upgrade !== 'websocket') {
        return new Response('Expected Upgrade: websocket', { status: 426 });
      }

      const [client, server] = Object.values(new WebSocketPair());
      server.accept();

      console.log('✅ Client connected!');

      server.addEventListener('message', (event) => {
        console.log('📩 Server received:', event.data);
        // Echo back whatever was sent
        server.send('Echo: ' + event.data);
        console.log('📤 Server sent echo back');
      });

      server.addEventListener('close', () => {
        console.log('❌ Client disconnected');
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    // ─── WEB PAGE ───
    return new Response(`<!DOCTYPE html>
<html>
<head>
  <title>WebSocket Test</title>
  <style>
    body { background: #0d0d1a; color: #e0e0e0; font-family: Arial; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
    .container { background: #1a1a2e; padding: 30px; border-radius: 20px; max-width: 500px; width: 100%; text-align: center; }
    h1 { color: #a78bfa; }
    .status { background: #22c55e; color: #fff; padding: 4px 16px; border-radius: 20px; display: inline-block; }
    .url-box { background: #0d0d1a; padding: 10px; border-radius: 8px; margin: 15px 0; border: 1px solid #2d2d44; }
    .url-box code { color: #fbbf24; }
  </style>
</head>
<body>
  <div class="container">
    <h1>⚡ WebSocket Test</h1>
    <p><span class="status">● Online</span></p>
    <div class="url-box"><code>wss://zlfinder-websocket.noahchico52.workers.dev/ws</code></div>
    <p style="color:#6b7280;">Connect your Roblox script to test</p>
  </div>
</body>
</html>`, {
      headers: { 'Content-Type': 'text/html; charset=UTF-8' }
    });
  }
};
