const express = require("express");
const router = express.Router();
const scoreLogController = require("../Controllers/scoreLogController");
const { authenticateJWT } = require("../Middleware/authMiddleware");

/**
 * Score Log Routes
 */

// Record first successful quiz completion only
// POST /api/scorelogs
router.post("/", authenticateJWT, scoreLogController.createScoreLog);

module.exports = router;
