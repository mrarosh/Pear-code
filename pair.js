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
  let operationTimeout = null;
  
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
    
    // Create WhatsApp connection with minimal settings
    const authState = createAuthState(sessionId);
    
    sock = makeWASocket({
      auth: authState,
      printQRInTerminal: false,
      logger: pino({ level: "fatal" }),
      browser: Browsers.macOS("Safari"),
      connectTimeoutMs: 15000, // 15 second connection timeout
      keepAliveIntervalMs: 5000, // Very frequent keep-alive
      retryRequestDelayMs: 500,
      maxRetries: 1,
      emitOwnEvents: false,
      shouldIgnoreJid: jid => jid.includes('@broadcast'),
      markOnlineOnConnect: false,
      generateHighQualityLinkPreview: false,
      getMessage: async () => {
        return { conversation: 'hello' }
      },
      // Disable features that might cause issues
      fireInitQueries: false,
      auth: {
        creds: authState.creds,
        keys: authState.keys,
        saveCreds: authState.saveCreds
      }
    });

    let connectionEstablished = false;
    let pairingCodeGenerated = false;

    // Set operation timeout (total time for the entire operation)
    operationTimeout = setTimeout(() => {
      if (!responseSent) {
        responseSent = true;
        res.status(408).json({ 
          error: "Operation timeout - please try again",
          code: "OPERATION_TIMEOUT"
        });
        cleanup();
      }
    }, 15000); // 15 second total timeout

    // Handle connection updates
    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        console.log("QR Code generated for:", num);
      }
      
      if (connection === "open" && !connectionEstablished) {
        connectionEstablished = true;
        
        try {
          // Minimal delay for connection stabilization
          await delay(1000);
          
          if (!sock.authState.creds.registered && !pairingCodeGenerated) {
            pairingCodeGenerated = true;
            
            // Request pairing code with timeout
            const codePromise = sock.requestPairingCode(num);
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Pairing code request timeout')), 10000)
            );
            
            const code = await Promise.race([codePromise, timeoutPromise]);
            
            if (!responseSent) {
              responseSent = true;
              res.json({ 
                code: code,
                number: num,
                message: "WhatsApp pairing code generated successfully",
                sessionId: sessionId
              });
            }
            
            // Immediate cleanup
            cleanup();
            
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
        
        if (!responseSent) {
          responseSent = true;
          if (shouldReconnect) {
            res.status(500).json({ 
              error: "Connection lost. Please try again.",
              code: "CONNECTION_LOST"
            });
          } else {
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
      if (operationTimeout) {
        clearTimeout(operationTimeout);
        operationTimeout = null;
      }
      
      // Clean up socket
      if (sock) {
        try {
          // Force close the WebSocket
          if (sock.ws) {
            sock.ws.close();
          }
        } catch (e) {
          console.log("Error closing socket:", e);
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
    if (operationTimeout) clearTimeout(operationTimeout);
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
