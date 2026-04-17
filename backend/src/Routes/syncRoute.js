const express = require("express");
const quizController = require("../Controllers/quizController");
const { authenticateJWT } = require("../Middleware/authMiddleware");

const router = express.Router();

// Sync queued offline quiz submissions
// POST /api/sync
router.post("/", authenticateJWT, quizController.syncPendingSubmissions);

module.exports = router;
