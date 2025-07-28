const mega = require("megajs");
const fs = require("fs");
const path = require("path");

// Session cache to avoid repeated authentications
let sessionCache = null;
let lastAuthTime = 0;
const AUTH_COOLDOWN = 30000; // 30 seconds between auth attempts
const SESSION_CACHE_FILE = path.join(__dirname, '.mega_session_cache.json');

// Load cached session if available
function loadCachedSession() {
  try {
    if (fs.existsSync(SESSION_CACHE_FILE)) {
      const cached = JSON.parse(fs.readFileSync(SESSION_CACHE_FILE, 'utf8'));
      const now = Date.now();
      // Cache expires after 24 hours
      if (now - cached.timestamp < 24 * 60 * 60 * 1000) {
        sessionCache = cached.session;
        lastAuthTime = cached.timestamp;
        return true;
      }
    }
  } catch (error) {
    console.log('Failed to load cached session:', error.message);
  }
  return false;
}

// Save session to cache
function saveCachedSession(session) {
  try {
    const cacheData = {
      session: session,
      timestamp: Date.now()
    };
    fs.writeFileSync(SESSION_CACHE_FILE, JSON.stringify(cacheData));
  } catch (error) {
    console.log('Failed to save session cache:', error.message);
  }
}

// Clear session cache
function clearSessionCache() {
  try {
    if (fs.existsSync(SESSION_CACHE_FILE)) {
      fs.unlinkSync(SESSION_CACHE_FILE);
    }
    sessionCache = null;
    lastAuthTime = 0;
    console.log('Session cache cleared successfully');
  } catch (error) {
    console.log('Failed to clear session cache:', error.message);
  }
}

const auth = {
  email: "masterblack20051031@gmail.com",  // Replace with your actual Mega email
  password: "Arosha2005@",   // Replace with your actual Mega password
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246",
};

// Check if error indicates account is blocked
function isBlockedError(error) {
  const errorMessage = error.message || error.toString();
  return errorMessage.includes('EBLOCKED') || 
         errorMessage.includes('blocked') || 
         errorMessage.includes('-16') ||
         errorMessage.includes('User blocked');
}

// Check if error indicates rate limiting
function isRateLimitError(error) {
  const errorMessage = error.message || error.toString();
  return errorMessage.includes('rate limit') || 
         errorMessage.includes('too many requests') ||
         errorMessage.includes('ERATE');
}

// Create storage with session reuse
function createStorage() {
  return new Promise((resolve, reject) => {
    const now = Date.now();
    
    // Check if we need to wait due to rate limiting
    if (now - lastAuthTime < AUTH_COOLDOWN) {
      const waitTime = AUTH_COOLDOWN - (now - lastAuthTime);
      console.log(`Rate limiting: waiting ${waitTime}ms before next auth attempt`);
      setTimeout(() => createStorage().then(resolve).catch(reject), waitTime);
      return;
    }

    // Try to use cached session first
    if (sessionCache && !loadCachedSession()) {
      console.log('Using cached session');
      const storage = new mega.Storage({
        ...auth,
        auth: sessionCache
      });
      
      storage.on("ready", () => {
        lastAuthTime = Date.now();
        resolve(storage);
      });
      
      storage.on("error", (err) => {
        console.log('Cached session failed, trying fresh auth:', err.message);
        clearSessionCache();
        // Fall back to fresh authentication
        createFreshStorage().then(resolve).catch(reject);
      });
      
      return;
    }

    // Fresh authentication
    createFreshStorage().then(resolve).catch(reject);
  });
}

// Create storage with fresh authentication
function createFreshStorage() {
  return new Promise((resolve, reject) => {
    console.log('Creating fresh Mega storage connection');
    const storage = new mega.Storage(auth);
    
    storage.on("ready", () => {
      console.log("Storage is ready. Caching session for reuse.");
      lastAuthTime = Date.now();
      
      // Cache the session for future use
      if (storage.options && storage.options.auth) {
        sessionCache = storage.options.auth;
        saveCachedSession(storage.options.auth);
      }
      
      resolve(storage);
    });

    storage.on("error", (err) => {
      console.log('Mega storage error:', err.message);
      
      // Handle blocked account
      if (isBlockedError(err)) {
        console.log('❌ ACCOUNT BLOCKED: Your Mega account is currently blocked.');
        console.log('💡 Solutions:');
        console.log('   1. Wait 24-48 hours before trying again');
        console.log('   2. Try logging into Mega via web browser');
        console.log('   3. Check if your account has any restrictions');
        console.log('   4. Consider using a different Mega account');
        clearSessionCache();
        reject(new Error('Mega account is blocked. Please wait 24-48 hours or use a different account.'));
        return;
      }
      
      // Handle rate limiting
      if (isRateLimitError(err)) {
        console.log('⚠️ Rate limit detected, waiting 2 minutes before retry...');
        clearSessionCache();
        setTimeout(() => {
          createFreshStorage().then(resolve).catch(reject);
        }, 120000); // Wait 2 minutes before retry
        return;
      }
      
      // Handle other auth errors
      if (err.message.includes('auth') || err.message.includes('password') || err.message.includes('email')) {
        console.log('❌ Authentication error detected');
        console.log('💡 Please check your email and password in mega.js');
        clearSessionCache();
        reject(new Error('Authentication failed. Please check your Mega credentials.'));
        return;
      }
      
      reject(err);
    });
  });
}

const upload = (data, name) => {
  return new Promise(async (resolve, reject) => {
    try {
      const storage = await createStorage();
      
      console.log("Storage is ready. Proceeding with upload.");

      const uploadStream = storage.upload({ name, allowUploadBuffering: true });

      uploadStream.on("complete", (file) => {
        file.link((err, url) => {
          if (err) {
            console.log('Error getting file link:', err.message);
            reject(err);
          } else {
            console.log('Upload completed successfully');
            storage.close();
            resolve(url);
          }
        });
      });

      uploadStream.on("error", (err) => {
        console.log('Upload stream error:', err.message);
        storage.close();
        reject(err);
      });

      data.pipe(uploadStream);
    } catch (error) {
      console.log('Failed to create storage:', error.message);
      reject(error);
    }
  });
};

// Function to get session ID (for bot.js compatibility)
async function getMegaSession() {
  return new Promise(async (resolve, reject) => {
    try {
      const storage = await createStorage();
      
      storage.once('ready', () => {
        const sessionId = storage.options.auth;
        storage.close();
        resolve(sessionId);
      });
      
      storage.once('error', (err) => {
        storage.close();
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = { upload, getMegaSession, clearSessionCache };
