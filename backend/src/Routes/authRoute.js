const express = require("express");
const { register, login, changePassword } = require("../Controllers/authController");
const { authenticateJWT } = require("../Middleware/authMiddleware");

const router = express.Router();

// Register a new user
router.post("/register", register);

// Login existing user
router.post("/login", login);

// Authenticated password update for first-time login and credential resets
router.post("/change-password", authenticateJWT, changePassword);

module.exports = router;
