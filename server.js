app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>ZLFinder Server</title>
            <style>
                body { 
                    background: #0d0d1a; 
                    color: #e0e0e0; 
                    font-family: Arial, sans-serif; 
                    display: flex; 
                    justify-content: center; 
                    align-items: center; 
                    height: 100vh; 
                    margin: 0; 
                    flex-direction: column;
                }
                h1 { color: #a78bfa; }
                p { color: #9ca3af; }
                .status { color: #22c55e; }
            </style>
        </head>
        <body>
            <h1>⚡ ZLFinder WebSocket Server</h1>
            <p>✅ Server is <span class="status">running</span></p>
            <p>📍 WebSocket URL: <code>wss://nlfinder.onrender.com/ws</code></p>
            <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
                This server handles WebSocket connections for ZLFinder.
            </p>
        </body>
        </html>
    `);
});
