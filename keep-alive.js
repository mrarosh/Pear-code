const https = require('https');
const http = require('http');

// Function to ping the health endpoint
function pingHealth() {
  const url = process.env.REPLIT_URL || 'https://your-replit-url.replit.co';
  
  const protocol = url.startsWith('https') ? https : http;
  
  const req = protocol.get(`${url}/health`, (res) => {
    console.log(`✅ Health check successful: ${res.statusCode}`);
  });
  
  req.on('error', (err) => {
    console.error(`❌ Health check failed: ${err.message}`);
  });
  
  req.setTimeout(10000, () => {
    console.log('⏰ Health check timeout');
    req.destroy();
  });
}

// Ping every 5 minutes
setInterval(pingHealth, 300000);

// Initial ping
pingHealth();

console.log('🔄 Keep-alive script started');
console.log('⏰ Will ping every 5 minutes'); 