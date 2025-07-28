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
  let sock = null;
  let sessionId = null;
  
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
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create WhatsApp connection with optimized settings
    const authState = createAuthState(sessionId);
    
    sock = makeWASocket({
      auth: authState,
      printQRInTerminal: false,
      logger: pino({ level: "fatal" }),
      browser: Browsers.macOS("Safari"),
      connectTimeoutMs: 30000, // Reduced timeout
      keepAliveIntervalMs: 15000, // More frequent keep-alive
      retryRequestDelayMs: 2000,
      maxRetries: 3,
      emitOwnEvents: false,
      shouldIgnoreJid: jid => jid.includes('@broadcast'),
    });

    let connectionEstablished = false;
    let pairingCodeGenerated = false;

    // Handle connection updates
    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        console.log("QR Code generated for:", num);
      }
      
      if (connection === "open" && !connectionEstablished) {
        connectionEstablished = true;
        
        try {
          // Wait a bit for connection to stabilize
          await delay(3000);
          
          if (!sock.authState.creds.registered && !pairingCodeGenerated) {
            pairingCodeGenerated = true;
            
            const code = await sock.requestPairingCode(num);
            
            if (!res.headersSent) {
              res.json({ 
                code: code,
                number: num,
                message: "WhatsApp pairing code generated successfully",
                sessionId: sessionId
              });
            }
            
            // Clean up session after 2 minutes (reduced time)
            setTimeout(() => {
              sessions.delete(sessionId);
            }, 120000);
            
          } else if (sock.authState.creds.registered && !res.headersSent) {
            res.status(400).json({ 
              error: "Number already registered",
              code: "ALREADY_REGISTERED"
            });
          }
          
        } catch (error) {
          console.error("Error requesting pairing code:", error);
          if (!res.headersSent) {
            res.status(500).json({ 
              error: "Failed to generate pairing code. Please try again.",
              code: "GENERATION_FAILED"
            });
          }
        }
      } else if (connection === "close") {
        const shouldReconnect = (lastDisconnect?.error) instanceof Error && 
          lastDisconnect.error.message !== DisconnectReason.loggedOut;
        
        if (shouldReconnect && !pairingCodeGenerated) {
          console.log("Connection closed, attempting to reconnect...");
          // Don't attempt reconnection in serverless - just return error
          if (!res.headersSent) {
            res.status(500).json({ 
              error: "Connection lost. Please try again.",
              code: "CONNECTION_LOST"
            });
          }
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
    }, 25000); // Reduced timeout to 25 seconds

  } catch (error) {
    console.error("Error in pairing process:", error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: "Service temporarily unavailable. Please try again.",
        code: "SERVICE_ERROR"
      });
    }
  } finally {
    // Cleanup function
    const cleanup = () => {
      if (sock) {
        try {
          sock.end();
        } catch (e) {
          console.log("Error ending socket:", e);
        }
      }
      if (sessionId) {
        sessions.delete(sessionId);
      }
    };
    
    // Cleanup after response is sent
    if (res.headersSent) {
      setTimeout(cleanup, 1000);
    } else {
      cleanup();
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
