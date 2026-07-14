-- Roblox Script - Receives "print" and "all" from Web

local Players = game:GetService("Players")
local HttpService = game:GetService("HttpService")
local localPlayer = Players.LocalPlayer

local WS_URL = "wss://zlfinder-websocket.noahchico52.workers.dev/ws"

print("🚀 Starting...")

local ws = nil
local isConnected = false

local function connect()
    print("🔌 Connecting...")
    local success, socket = pcall(function()
        return WebSocket.connect(WS_URL)
    end)
    
    if not success or not socket then
        warn("❌ Failed to connect:", socket)
        return
    end
    
    ws = socket
    isConnected = true
    print("✅ WebSocket connected!")
    
    -- Send player info
    local playerInfo = {
        type = "player_info",
        data = {
            name = localPlayer.Name,
            userId = tostring(localPlayer.UserId),
            executor = "Potassium",
            isOwner = true
        }
    }
    
    ws:Send(HttpService:JSONEncode(playerInfo))
    print("✅ Player info sent!")
    
    -- ─── RECEIVE MESSAGES ───
    if ws.OnMessage then
        ws.OnMessage:Connect(function(raw)
            print("📩 Received:", raw)
            
            if raw == "print" then
                print("🖨️🖨️🖨️ PRINT COMMAND RECEIVED! 🖨️🖨️🖨️")
                return
            end
            
            if raw == "all" then
                print("📢📢📢 ALL COMMAND RECEIVED! 📢📢📢")
                return
            end
            
            local success, data = pcall(function()
                return HttpService:JSONDecode(raw)
            end)
            
            if success and data then
                print("📩 Parsed type:", data.type)
                if data.type == "kick" then
                    print("👢👢👢 KICK! 👢👢👢")
                    localPlayer:Kick(data.data.message or "Kicked!")
                end
            end
        end)
    end
    
    if ws.OnClose then
        ws.OnClose:Connect(function()
            print("🔴 Disconnected")
            isConnected = false
            ws = nil
        end)
    end
end

task.spawn(connect)

print("✅ Script loaded!")
print("📌 Web page: https://zlfinder-websocket.noahchico52.workers.dev/")
