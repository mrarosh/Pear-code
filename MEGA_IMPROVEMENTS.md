# Mega Account Blocking Solution

## Problem
The Mega account was getting blocked after using the pier code once and obtaining the session ID. This was caused by:
- Repeated authentications without session reuse
- No rate limiting between auth attempts
- No error handling for blocked accounts
- No session caching mechanism

## Solution Implemented

### 1. Session Caching
- Sessions are now cached locally in `.mega_session_cache.json`
- Cache expires after 24 hours
- Reduces authentication attempts by reusing valid sessions

### 2. Rate Limiting
- 30-second cooldown between authentication attempts
- Prevents rapid successive auth requests that trigger blocks
- Automatic retry with longer delays for auth errors

### 3. Error Handling
- Detects auth errors, blocks, and rate limits
- Automatically clears cache and retries with delays
- Better logging for debugging issues

### 4. Session Reuse
- Uses cached sessions when available
- Falls back to fresh authentication if cache fails
- Maintains compatibility with existing code

## Key Features

### Session Management
```javascript
const { upload, getMegaSession, clearSessionCache } = require('./mega');

// Upload file with automatic session management
const url = await upload(fileStream, 'filename.txt');

// Get session ID for bot functionality
const sessionId = await getMegaSession();

// Clear cache if needed
clearSessionCache();
```

### Automatic Features
- **Session Caching**: Sessions are automatically cached and reused
- **Rate Limiting**: 30-second cooldown between auth attempts
- **Error Recovery**: Automatic retry with exponential backoff
- **Block Detection**: Detects and handles account blocks

## Configuration

Update your Mega credentials in `mega.js`:
```javascript
const auth = {
  email: "your-email@example.com",
  password: "your-mega-password",
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36..."
};
```

## Testing

Run the test script to verify functionality:
```bash
node test-mega.js
```

## Troubleshooting

### If account is still getting blocked:
1. Clear the session cache: `clearSessionCache()`
2. Wait 24 hours before trying again
3. Check if your Mega account has any restrictions
4. Verify your credentials are correct

### If uploads fail:
1. Check internet connection
2. Verify Mega account has available storage
3. Ensure file size is within Mega limits
4. Check console logs for specific error messages

## Benefits
- ✅ Prevents account blocking
- ✅ Reduces authentication overhead
- ✅ Better error handling and recovery
- ✅ Maintains backward compatibility
- ✅ Improved logging for debugging 