# ONYX MD WhatsApp Bot - 24/7 Replit Setup

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

## 🔄 24/7 Operation Solutions

### Option 1: UptimeRobot (Recommended)

1. Go to [UptimeRobot](https://uptimerobot.com/)
2. Create a free account
3. Add a new monitor:
   - **Monitor Type:** HTTP(s)
   - **URL:** `https://your-replit-url.replit.co/health`
   - **Check Interval:** 5 minutes
   - **Alert When Down:** Yes

### Option 2: Replit Keep-Alive

1. **Set up environment variable:**
   - In Replit, go to "Tools" → "Secrets"
   - Add: `REPLIT_URL` = `https://your-replit-url.replit.co`

2. **Run keep-alive script:**
   ```bash
   npm run keep-alive
   ```

### Option 3: External Monitoring Services

- **Cron-job.org:** Set up a cron job to ping your health endpoint
- **Pingdom:** Professional uptime monitoring
- **StatusCake:** Free uptime monitoring

## 🏥 Health Check Endpoint

Your server now includes a health check endpoint:
- **URL:** `https://your-replit-url.replit.co/health`
- **Response:** JSON with status, timestamp, and uptime

## 🔧 Configuration

### Environment Variables
- `PORT`: Server port (default: 8000)
- `REPLIT_URL`: Your Replit URL for keep-alive script

### PM2 Commands (if needed)
```bash
npm run pm2-start    # Start with PM2
npm run pm2-stop     # Stop PM2 process
npm run pm2-restart  # Restart PM2 process
```

## 🛠️ Troubleshooting

### If Replit stops unexpectedly:
1. Check the console for error messages
2. Ensure all dependencies are installed
3. Verify the health endpoint is accessible
4. Check Replit's resource usage

### Common Issues:
- **Memory limits:** Replit has memory constraints
- **Inactivity timeout:** Use uptime monitoring
- **Process crashes:** Check error logs

## 📊 Monitoring

The server includes:
- ✅ Health check endpoint
- ✅ Keep-alive mechanism
- ✅ Error handling
- ✅ Uptime logging

## 🔗 Useful Links

- [Replit Documentation](https://docs.replit.com/)
- [UptimeRobot](https://uptimerobot.com/)
- [PM2 Documentation](https://pm2.keymetrics.io/)

---

**Note:** For 24/7 operation, we recommend using UptimeRobot or similar services to ping your health endpoint every 5-10 minutes. 