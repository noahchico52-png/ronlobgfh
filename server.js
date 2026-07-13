// server.js - Cloudflare Worker with Password Protection

const SECRET_KEY = "MewVantaIsTheBest"; // CHANGE THIS TO YOUR PASSWORD

const players = new Map();
let ownerId = null;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ─── WEBSOCKET CONNECTION (No password required) ───
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
              connectedAt: new Date().toISOString()
            });

            if (isOwner) {
              ownerId = playerId;
              console.log(`👑 OWNER connected: ${playerName}`);
            }

            console.log(`👤 Player stored: ${playerName} (${playerId})`);
            console.log(`📊 Total players: ${players.size}`);

            server.send(JSON.stringify({
              type: 'player_info_received',
              data: {
                message: `Welcome ${playerName}!`,
                players: getPlayerList(),
                isOwner: isOwner
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
          if (playerId === ownerId) {
            ownerId = null;
            console.log('👑 Owner disconnected');
          }
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

    // ─── API: Send Broadcast (REQUIRES PASSWORD) ───
    if (url.pathname === '/api/broadcast' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { message, password } = body;

        // ─── PASSWORD CHECK ───
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

        // Check if there's an owner connected
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
          message: 'Broadcast sent to ' + players.size + ' players!'
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

    // ─── WEB PAGE (REQUIRES PASSWORD IN URL) ───
    const userKey = url.searchParams.get('key');
    
    if (!userKey || userKey !== SECRET_KEY) {
      return new Response(`🔒 Access Denied - Invalid Password`, {
        status: 401,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // ─── WEB PAGE (Only shows if password is correct) ───
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
    .broadcast-row button:hover { opacity: 0.8; transform: scale(1.02); }
    .broadcast-row button:disabled { opacity: 0.5; cursor: not-allowed; }
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
      right:
