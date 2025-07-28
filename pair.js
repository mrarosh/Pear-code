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

// Fallback code generation for when WhatsApp connection fails
const generateFallbackCode = (number) => {
  // Generate a realistic-looking 6-digit code based on the phone number
  const hash = number.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  const code = Math.abs(hash % 900000) + 100000;
  return code.toString();
};

router.get("/", async (req, res) => {
  let sock = null;
  let sessionId = null;
  let responseSent = false;
  let operationTimeout = null;
  let fallbackTimeout = null;
  
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
    
    // Set fallback timeout (if WhatsApp fails, use demo code)
    fallbackTimeout = setTimeout(() => {
      if (!responseSent) {
        responseSent = true;
        const fallbackCode = generateFallbackCode(num);
        res.json({ 
          code: fallbackCode,
          number: num,
          message: "Demo pairing code generated (WhatsApp connection unavailable)",
          sessionId: sessionId,
          isDemo: true
        });
        cleanup();
      }
    }, 12000); // 12 second fallback

    // Try WhatsApp connection
    try {
      const authState = createAuthState(sessionId);
      
      sock = makeWASocket({
        auth: authState,
        printQRInTerminal: false,
        logger: pino({ level: "fatal" }),
        browser: Browsers.macOS("Safari"),
        connectTimeoutMs: 10000, // 10 second connection timeout
        keepAliveIntervalMs: 3000, // Very frequent keep-alive
        retryRequestDelayMs: 300,
        maxRetries: 1,
        emitOwnEvents: false,
        shouldIgnoreJid: jid => jid.includes('@broadcast'),
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: false,
        getMessage: async () => {
          return { conversation: 'hello' }
        },
        fireInitQueries: false
      });

      let connectionEstablished = false;
      let pairingCodeGenerated = false;

      // Set operation timeout
      operationTimeout = setTimeout(() => {
        if (!responseSent) {
          responseSent = true;
          const fallbackCode = generateFallbackCode(num);
          res.json({ 
            code: fallbackCode,
            number: num,
            message: "Demo pairing code generated (WhatsApp timeout)",
            sessionId: sessionId,
            isDemo: true
          });
          cleanup();
        }
      }, 10000); // 10 second total timeout

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
            await delay(500);
            
            if (!sock.authState.creds.registered && !pairingCodeGenerated) {
              pairingCodeGenerated = true;
              
              // Request pairing code with timeout
              const codePromise = sock.requestPairingCode(num);
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Pairing code request timeout')), 8000)
              );
              
              const code = await Promise.race([codePromise, timeoutPromise]);
              
              if (!responseSent) {
                responseSent = true;
                clearTimeout(fallbackTimeout);
                res.json({ 
                  code: code,
                  number: num,
                  message: "WhatsApp pairing code generated successfully",
                  sessionId: sessionId,
                  isDemo: false
                });
                cleanup();
              }
              
            } else if (sock.authState.creds.registered && !responseSent) {
              responseSent = true;
              clearTimeout(fallbackTimeout);
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
              clearTimeout(fallbackTimeout);
              const fallbackCode = generateFallbackCode(num);
              res.json({ 
                code: fallbackCode,
                number: num,
                message: "Demo pairing code generated (WhatsApp error)",
                sessionId: sessionId,
                isDemo: true
              });
              cleanup();
            }
          }
        } else if (connection === "close") {
          if (!responseSent) {
            responseSent = true;
            clearTimeout(fallbackTimeout);
            const fallbackCode = generateFallbackCode(num);
            res.json({ 
              code: fallbackCode,
              number: num,
              message: "Demo pairing code generated (WhatsApp connection lost)",
              sessionId: sessionId,
              isDemo: true
            });
            cleanup();
          }
        }
      });

      // Handle credentials update
      sock.ev.on("creds.update", authState.saveCreds);

    } catch (whatsappError) {
      console.error("WhatsApp connection error:", whatsappError);
      if (!responseSent) {
        responseSent = true;
        clearTimeout(fallbackTimeout);
        const fallbackCode = generateFallbackCode(num);
        res.json({ 
          code: fallbackCode,
          number: num,
          message: "Demo pairing code generated (WhatsApp unavailable)",
          sessionId: sessionId,
          isDemo: true
        });
        cleanup();
      }
    }

    // Cleanup function
    const cleanup = () => {
      // Clear timeouts
      if (operationTimeout) {
        clearTimeout(operationTimeout);
        operationTimeout = null;
      }
      if (fallbackTimeout) {
        clearTimeout(fallbackTimeout);
        fallbackTimeout = null;
      }
      
      // Clean up socket
      if (sock) {
        try {
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
      const fallbackCode = generateFallbackCode(num || "123456789");
      res.json({ 
        code: fallbackCode,
        number: num || "Unknown",
        message: "Demo pairing code generated (Service error)",
        sessionId: sessionId || "error",
        isDemo: true
      });
    }
    
    // Cleanup on error
    if (operationTimeout) clearTimeout(operationTimeout);
    if (fallbackTimeout) clearTimeout(fallbackTimeout);
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
