const express = require("express");
const { register, login, changePassword, me, logout } = require("../Controllers/authController");
const { authenticateJWT } = require("../Middleware/authMiddleware");

const router = express.Router();

// Register a new user
router.post("/register", register);

// Login existing user
router.post("/login", login);

// Current authenticated user
router.get("/me", authenticateJWT, me);

// Logout current user
router.post("/logout", logout);

// Authenticated password update for first-time login and credential resets
router.post("/change-password", authenticateJWT, changePassword);

module.exports = router;
