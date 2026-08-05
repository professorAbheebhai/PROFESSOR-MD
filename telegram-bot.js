// ============================================
// PROFESSOR - Telegram Bot
// Bridges Website → Legend-MD
// ============================================

const { Telegraf } = require('telegraf');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// ===== 🔥 Aap Ka Token =====
const BOT_TOKEN = '8888809886:AAGKLoP6uOV9rk3psJigljazC3b9TErEt08';
const bot = new Telegraf(BOT_TOKEN);

// ===== Pending Requests Store =====
const pending = {};

// ============================================
// BOT COMMANDS
// ============================================

// /start
bot.start((ctx) => {
    ctx.reply(`
🎓 *PROFESSOR PAIRING BOT*

I generate WhatsApp pairing codes using Legend-MD.

📱 *Send your phone number:*
/pair 923xxxxxxxxx

⚠️ Make sure number is active on WhatsApp.
    `, { parse_mode: 'Markdown' });
});

// /pair - Main command
bot.command('pair', async (ctx) => {
    const args = ctx.message.text.split(' ');
    const phone = args[1];

    if (!phone) {
        return ctx.reply('❌ Please provide phone number. Example: /pair 923xxxxxxxxx');
    }

    const clean = phone.replace(/[^0-9]/g, '');
    if (clean.length < 10 || clean.length > 15) {
        return ctx.reply('❌ Invalid phone number. Must be 10-15 digits.');
    }

    // Store request
    const id = Date.now().toString();
    pending[id] = {
        phone: clean,
        status: 'pending',
        timestamp: Date.now()
    };

    await ctx.reply(`🔐 Generating pairing code for *${clean}*...`, { parse_mode: 'Markdown' });

    // The actual pairing code generation happens in Legend-MD
    // Legend-MD will respond in this chat
});

// ===== Listen for Legend-MD responses =====
bot.on('text', async (ctx) => {
    const msg = ctx.message.text;
    
    // Check if message contains a pairing code (6-8 digits)
    const codeMatch = msg.match(/\b\d{6,8}\b/);
    if (codeMatch && !msg.includes('/pair')) {
        const code = codeMatch[0];
        
        // Find and update pending request
        for (const [id, request] of Object.entries(pending)) {
            if (request.status === 'pending' && Date.now() - request.timestamp < 120000) {
                request.status = 'completed';
                request.code = code;
                
                await ctx.reply(`
✅ *Pairing Code Generated!*

🔑 Code: \`${code}\`

📱 Phone: ${request.phone}
⏱️ Valid for: 5 minutes

Open WhatsApp → Linked Devices → Link with phone number → Enter this code.

⚠️ This code expires in 5 minutes.
                `, { parse_mode: 'Markdown' });
                
                delete pending[id];
                break;
            }
        }
    }
});

// ============================================
// START BOT
// ============================================
bot.launch()
    .then(() => {
        console.log(`
====================================
🤖 PROFESSOR Telegram Bot
✅ Bot is running!
📡 Username: ${bot.botInfo?.username || 'unknown'}
====================================
        `);
    })
    .catch(err => {
        console.error('❌ Bot failed to start:', err);
    });

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
process.once('SIGINT', () => {
    console.log('🛑 Stopping bot...');
    bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
    console.log('🛑 Stopping bot...');
    bot.stop('SIGTERM');
});
