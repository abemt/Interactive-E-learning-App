const express = require("express");
const router = express.Router();
const gamificationController = require("../Controllers/gamificationController");
const { authenticateJWT } = require("../Middleware/authMiddleware");

/**
 * Gamification Routes
 * All routes require authentication
 */

// Award XP to user for completing content
router.post("/award-xp", authenticateJWT, gamificationController.awardXP);

// Generate gamification elements for a new course (Teachers/Admins only)
router.post("/generate-course", authenticateJWT, gamificationController.generateCourseGamification);

// Get user's progress in a specific module
router.get("/progress/:moduleId", authenticateJWT, gamificationController.getUserProgress);

// Get leaderboard for a module
router.get("/leaderboard/:moduleId", authenticateJWT, gamificationController.getLeaderboard);

// Get all badges earned by current user
router.get("/my-badges", authenticateJWT, gamificationController.getMyBadges);

// Get student dashboard overview data
router.get("/student-overview", authenticateJWT, gamificationController.getStudentOverview);

// Get available badge definitions for a module
router.get("/badges/:moduleId", authenticateJWT, gamificationController.getModuleBadges);

// Check level up status for a module
router.post("/check-level/:moduleId", authenticateJWT, gamificationController.checkLevelUp);

module.exports = router;
