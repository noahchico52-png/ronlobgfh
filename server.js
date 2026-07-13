// server.js - Cloudflare Workers version

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ─── WebSocket Connection ───
    if (url.pathname === '/ws') {
      const upgrade = request.headers.get('Upgrade');
      if (upgrade !== 'websocket') {
        return new Response('Expected Upgrade: websocket', { status: 426 });
      }

      const [client, server] = Object.values(new WebSocketPair());
      server.accept();

      server.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📩 Received:', data);
          server.send(JSON.stringify({
            type: 'echo',
            data: data
          }));
        } catch {
          server.send(`Echo: ${event.data}`);
        }
      });

      server.addEventListener('close', () => {
        console.log('❌ Client disconnected');
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    // ─── Web Page ───
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>ZLFinder WebSocket</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            background: #0d0d1a; 
            color: #e0e0e0; 
            font-family: Arial, sans-serif; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            margin: 0; 
          }
          .box {
            background: #1a1a2e;
            padding: 40px;
            border-radius: 16px;
            text-align: center;
            max-width: 500px;
          }
          h1 { color: #a78bfa; font-size: 28px; }
          .status { color: #4ade80; font-weight: bold; }
          code { 
            background: #2d2d44; 
            padding: 6px 14px; 
            border-radius: 6px; 
            display: inline-block;
            margin: 10px 0;
            font-size: 14px;
            color: #fbbf24;
          }
          p { color: #9ca3af; margin: 8px 0; }
          .note { font-size: 12px; color: #6b7280; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="box">
          <h1>⚡ ZLFinder</h1>
          <p>✅ Status: <span class="status">Online</span></p>
          <p>📍 WebSocket URL:</p>
          <code>wss://zlfinder-websocket.your-username.workers.dev/ws</code>
          <p class="note">🔌 Connect your Roblox script to this URL</p>
        </div>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
};
