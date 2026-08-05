// ============================================
// PROFESSOR - Complete Backend
// Connects Website → Telegram Bot → Legend-MD
// ============================================

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== 🔥 Aap Ki Settings =====
const BOT_TOKEN = '8888809886:AAGKLoP6uOV9rk3psJigljazC3b9TErEt08';
const CHAT_ID = '8378915653';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
// =============================

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ===== 20 Servers Generate =====
const servers = [];
for (let i = 1; i <= 20; i++) {
    servers.push({
        id: `server${i}`,
        name: `Server ${i}`,
        active: Math.floor(Math.random() * 10) + 1,
        limit: 50
    });
}

const status = {};
servers.forEach(s => {
    status[s.id] = {
        count: Math.floor(Math.random() * 10) + 1,
        limit: 50
    };
});

// ============================================
// API ROUTES
// ============================================

// 1. GET /api/servers - List all servers
app.get('/api/servers', (req, res) => {
    res.json({ success: true, servers });
});

// 2. GET /api/status/:serverId - Server status
app.get('/api/status/:serverId', (req, res) => {
    const data = status[req.params.serverId] || { count: 0, limit: 50 };
    res.json({ success: true, ...data });
});

// 3. GET /api/code - Generate pairing code
app.get('/api/code', async (req, res) => {
    const { server, number } = req.query;

    // Validate
    if (!server) {
        return res.status(400).json({ success: false, error: 'Server selection required' });
    }
    if (!number) {
        return res.status(400).json({ success: false, error: 'Phone number required' });
    }

    const clean = number.replace(/[^0-9]/g, '');
    if (clean.length < 10 || clean.length > 15) {
        return res.status(400).json({ success: false, error: 'Invalid phone number format' });
    }

    const serverExists = servers.some(s => s.id === server);
    if (!serverExists) {
        return res.status(404).json({ success: false, error: 'Server not found' });
    }

    try {
        // Send request to Telegram bot
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
            chat_id: CHAT_ID,
            text: `/pair ${clean}`,
            parse_mode: 'HTML'
        });

        console.log(`[API] Request sent to bot for: ${clean}`);

        // Poll for response (30 seconds max)
        let code = null;
        let attempts = 0;
        const maxAttempts = 30;

        while (attempts < maxAttempts && !code) {
            attempts++;
            await new Promise(r => setTimeout(r, 1000));

            const updates = await axios.get(`${TELEGRAM_API}/getUpdates`, {
                params: { timeout: 5 }
            });

            for (const update of updates.data.result || []) {
                const msg = update.message;
                if (msg && msg.text && msg.chat.id.toString() === CHAT_ID) {
                    // Look for 6-8 digit pairing code
                    const match = msg.text.match(/\b\d{6,8}\b/);
                    if (match) {
                        code = match[0];
                        console.log(`[API] Code found: ${code}`);
                        break;
                    }
                }
            }
        }

        if (!code) {
            throw new Error('Timeout waiting for pairing code from bot');
        }

        // Update server status
        if (status[server]) {
            status[server].count = (status[server].count || 0) + 1;
        }

        res.json({
            success: true,
            code: code,
            server: server,
            number: clean,
            message: 'Pairing code generated successfully!'
        });

    } catch (error) {
        console.error('[API] Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate pairing code'
        });
    }
});

// 4. GET /api/health - Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        servers: servers.length,
        bot: BOT_TOKEN ? 'configured' : 'missing'
    });
});

// 5. Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
    console.log(`
====================================
🎓 PROFESSOR API Server
📍 Running on: http://localhost:${PORT}
📡 Servers: ${servers.length}
🤖 Bot: ${BOT_TOKEN ? '✅ Configured' : '❌ Missing'}
====================================
    `);
});
