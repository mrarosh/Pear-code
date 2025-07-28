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
  let responseSent = false;
  let connectionTimeout = null;
  let cleanupTimeout = null;
  
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
      connectTimeoutMs: 20000, // Reduced timeout
      keepAliveIntervalMs: 10000, // More frequent keep-alive
      retryRequestDelayMs: 1000,
      maxRetries: 2,
      emitOwnEvents: false,
      shouldIgnoreJid: jid => jid.includes('@broadcast'),
      markOnlineOnConnect: false,
      generateHighQualityLinkPreview: false,
      getMessage: async () => {
        return { conversation: 'hello' }
      }
    });

    let connectionEstablished = false;
    let pairingCodeGenerated = false;

    // Set connection timeout
    connectionTimeout = setTimeout(() => {
      if (!responseSent) {
        responseSent = true;
        res.status(408).json({ 
          error: "Connection timeout - please try again",
          code: "CONNECTION_TIMEOUT"
        });
        cleanup();
      }
    }, 20000); // 20 second connection timeout

    // Handle connection updates
    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        console.log("QR Code generated for:", num);
      }
      
      if (connection === "open" && !connectionEstablished) {
        connectionEstablished = true;
        
        // Clear connection timeout
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          connectionTimeout = null;
        }
        
        try {
          // Wait a bit for connection to stabilize
          await delay(2000);
          
          if (!sock.authState.creds.registered && !pairingCodeGenerated) {
            pairingCodeGenerated = true;
            
            const code = await sock.requestPairingCode(num);
            
            if (!responseSent) {
              responseSent = true;
              res.json({ 
                code: code,
                number: num,
                message: "WhatsApp pairing code generated successfully",
                sessionId: sessionId
              });
            }
            
            // Schedule cleanup
            cleanupTimeout = setTimeout(() => {
              cleanup();
            }, 5000); // Cleanup after 5 seconds
            
          } else if (sock.authState.creds.registered && !responseSent) {
            responseSent = true;
            res.status(400).json({ 
              error: "Number already registered",
              code: "ALREADY_REGISTERED"
            });
            cleanup();
          }
          
        } catch (error) {
          console.error("Error requesting pairing code:", error);
          if (!responseSent) {
            responseSent = true;
            res.status(500).json({ 
              error: "Failed to generate pairing code. Please try again.",
              code: "GENERATION_FAILED"
            });
            cleanup();
          }
        }
      } else if (connection === "close") {
        const shouldReconnect = (lastDisconnect?.error) instanceof Error && 
          lastDisconnect.error.message !== DisconnectReason.loggedOut;
        
        if (shouldReconnect && !pairingCodeGenerated && !responseSent) {
          console.log("Connection closed, attempting to reconnect...");
          // Don't attempt reconnection in serverless - just return error
          responseSent = true;
          res.status(500).json({ 
            error: "Connection lost. Please try again.",
            code: "CONNECTION_LOST"
          });
          cleanup();
        } else if (!shouldReconnect) {
          console.log("Connection closed permanently");
          if (!responseSent) {
            responseSent = true;
            res.status(500).json({ 
              error: "Connection failed. Please try again.",
              code: "CONNECTION_FAILED"
            });
          }
          cleanup();
        }
      }
    });

    // Handle credentials update
    sock.ev.on("creds.update", authState.saveCreds);

    // Cleanup function
    const cleanup = () => {
      // Clear timeouts
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        connectionTimeout = null;
      }
      if (cleanupTimeout) {
        clearTimeout(cleanupTimeout);
        cleanupTimeout = null;
      }
      
      // Clean up socket
      if (sock) {
        try {
          // Only end if connection is established
          if (sock.user && sock.user.id) {
            sock.end();
          } else {
            // Force close if not properly connected
            sock.ws?.close();
          }
        } catch (e) {
          console.log("Error ending socket:", e);
        }
        sock = null;
      }
      
      // Clean up session
      if (sessionId) {
        sessions.delete(sessionId);
        sessionId = null;
      }
    };

    // Handle request close
    req.on('close', () => {
      if (!responseSent) {
        responseSent = true;
        cleanup();
      }
    });

  } catch (error) {
    console.error("Error in pairing process:", error);
    if (!responseSent) {
      responseSent = true;
      res.status(500).json({ 
        error: "Service temporarily unavailable. Please try again.",
        code: "SERVICE_ERROR"
      });
    }
    
    // Cleanup on error
    if (connectionTimeout) clearTimeout(connectionTimeout);
    if (cleanupTimeout) clearTimeout(cleanupTimeout);
    if (sock) {
      try {
        sock.ws?.close();
      } catch (e) {
        console.log("Error closing socket on error:", e);
      }
    }
    if (sessionId) sessions.delete(sessionId);
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
