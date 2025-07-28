const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { getMegaSession } = require('./mega');
const { megaEmail, megaPassword } = require('./config');

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || !msg.key.remoteJid) return;

    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    if (text.trim().toLowerCase() === '.session') {
      try {
        const sessionId = await getMegaSession();
        await sock.sendMessage(msg.key.remoteJid, { text: `Your MEGA session ID:\n\n${sessionId}` });
      } catch (err) {
        await sock.sendMessage(msg.key.remoteJid, { text: `Failed to get MEGA session: ${err.message}` });
      }
    }
  });
}

startBot(); 