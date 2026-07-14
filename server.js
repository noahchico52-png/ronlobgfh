// Test WebSocket connection
const ws = new WebSocket('wss://zlfinder-websocket.noahchico52.workers.dev/ws');

ws.onopen = function() {
    console.log('✅ WebSocket connected!');
    // Send player info
    ws.send(JSON.stringify({
        type: "player_info",
        data: {
            name: "TestPlayer",
            userId: "123456789",
            executor: "Browser",
            isOwner: true
        }
    }));
    console.log('📤 Sent player info!');
};

ws.onmessage = function(event) {
    console.log('📩 Received:', event.data);
};

ws.onerror = function(error) {
    console.log('❌ WebSocket error:', error);
};

ws.onclose = function() {
    console.log('🔴 WebSocket closed');
};
