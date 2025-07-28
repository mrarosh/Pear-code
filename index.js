const express = require("express");
const app = express();
__path = process.cwd();
const bodyParser = require("body-parser");
const PORT = process.env.PORT || 8000;
let code = require("./pair");
require("events").EventEmitter.defaultMaxListeners = 500;

// Add health check endpoint for uptime monitoring
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use("/code", code);

app.use("/", async (req, res, next) => {
  res.sendFile(__path + "/pair.html");
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
