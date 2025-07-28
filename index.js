const express = require("express");
const app = express();
const path = require("path");
__path = process.cwd();
const bodyParser = require("body-parser");
const PORT = process.env.PORT || 8000;
let code = require("./pair");
require("events").EventEmitter.defaultMaxListeners = 500;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Add health check endpoint for uptime monitoring
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use("/code", code);

// Serve the main HTML file
app.get("/", async (req, res, next) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Add error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Keep alive mechanism
setInterval(() => {
  console.log(`🔄 Keep-alive ping at ${new Date().toISOString()}`);
}, 300000); // Ping every 5 minutes

app.listen(PORT, () => {
  console.log(`⏩ Server running on http://localhost:` + PORT);
  console.log(`🏥 Health check available at http://localhost:${PORT}/health`);
});

module.exports = app;
