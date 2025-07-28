const express = require("express");
const router = express.Router();
const pino = require("pino");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  delay,
  makeCacheableSignalKeyStore,
  Browsers,
  jidNormalizedUser,
  DisconnectReason,
} = require("@whiskeysockets/baileys");

// In-memory session storage for Vercel compatibility
const sessions = new Map();

// Create a temporary session directory in memory
const createTempSession = (sessionId) => {
  const session = {
    creds: {},
    keys: {},
    id: sessionId
  };
  sessions.set(sessionId, session);
  return session;
};

// Custom auth state for Vercel
const createAuthState = (sessionId) => {
  const session = sessions.get(sessionId) || createTempSession(sessionId);
  
  return {
    creds: session.creds,
    keys: makeCacheableSignalKeyStore(session.keys, pino({ level: "fatal" })),
    saveCreds: async (creds) => {
      session.creds = creds;
      sessions.set(sessionId, session);
    }
  };
};

router.get("/", async (req, res) => {
  try {
    let num = req.query.number;
    
    if (!num) {
      return res.status(400).json({ 
        error: "Phone number is required",
        code: "INVALID_NUMBER"
      });
    }

    // Clean the number
    num = num.replace(/[^0-9]/g, "");
    
    if (num.length < 11) {
      return res.status(400).json({ 
        error: "Invalid phone number format",
        code: "INVALID_FORMAT"
      });
    }

    // Create unique session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create WhatsApp connection
    const authState = createAuthState(sessionId);
    
    const sock = makeWASocket({
      auth: authState,
      printQRInTerminal: false,
      logger: pino({ level: "fatal" }),
      browser: Browsers.macOS("Safari"),
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 30000,
    });

    // Handle connection updates
    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        // QR code generated - this means we need to scan
        console.log("QR Code generated for:", num);
      }
      
      if (connection === "open") {
        try {
          // Connection is open, request pairing code
          await delay(2000);
          
          if (!sock.authState.creds.registered) {
            const code = await sock.requestPairingCode(num);
            
            if (!res.headersSent) {
              res.json({ 
                code: code,
                number: num,
                message: "WhatsApp pairing code generated successfully",
                sessionId: sessionId
              });
            }
            
            // Clean up session after 5 minutes
            setTimeout(() => {
              sessions.delete(sessionId);
            }, 300000);
            
          } else {
            if (!res.headersSent) {
              res.status(400).json({ 
                error: "Number already registered",
                code: "ALREADY_REGISTERED"
              });
            }
          }
          
        } catch (error) {
          console.error("Error requesting pairing code:", error);
          if (!res.headersSent) {
            res.status(500).json({ 
              error: "Failed to generate pairing code",
              code: "GENERATION_FAILED"
            });
          }
        }
      } else if (connection === "close") {
        const shouldReconnect = (lastDisconnect?.error) instanceof Error && 
          lastDisconnect.error.message !== DisconnectReason.loggedOut;
        
        if (shouldReconnect) {
          console.log("Connection closed, attempting to reconnect...");
        } else {
          console.log("Connection closed permanently");
          sessions.delete(sessionId);
        }
      }
    });

    // Handle credentials update
    sock.ev.on("creds.update", authState.saveCreds);

    // Set timeout for the entire operation
    setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({ 
          error: "Request timeout - please try again",
          code: "TIMEOUT"
        });
        sessions.delete(sessionId);
      }
    }, 30000); // 30 second timeout

  } catch (error) {
    console.error("Error in pairing process:", error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: "Service temporarily unavailable",
        code: "SERVICE_ERROR"
      });
    }
  }
});

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    sessions: sessions.size,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
