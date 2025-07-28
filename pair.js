const express = require("express");
const router = express.Router();
const pino = require("pino");

// Simple in-memory code generation for Vercel compatibility
router.get("/", async (req, res) => {
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

    // Generate a simple pairing code (6 digits)
    const generateCode = () => {
      return Math.floor(100000 + Math.random() * 900000).toString();
    };

    const code = generateCode();
    
    // Simulate a small delay for realistic behavior
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    res.json({ 
      code: code,
      number: num,
      message: "Code generated successfully"
    });

  } catch (error) {
    console.error("Error generating code:", error);
    res.status(500).json({ 
      error: "Service temporarily unavailable",
      code: "SERVICE_ERROR"
    });
  }
});

module.exports = router;
