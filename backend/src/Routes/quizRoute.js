const express = require("express");
const router = express.Router();
const quizController = require("../Controllers/quizController");
const { authenticateJWT } = require("../Middleware/authMiddleware");
const { uploadFields, uploadSingle } = require("../Middleware/uploadMiddleware");

/**
 * Quiz Question Routes
 * All routes require authentication
 */

// Create a new quiz question with optional image and audio upload
// POST /api/quiz/questions
// Accepts multipart/form-data with fields: image, audio, and JSON fields
router.post("/questions", authenticateJWT, uploadFields(), quizController.createQuestion);

// Get all questions for a specific quiz (ContentItem)
// GET /api/quiz/questions/content/:contentItemId
router.get("/questions/content/:contentItemId", authenticateJWT, quizController.getQuestionsByContentItem);

// Get render-ready quiz payload by quiz/content item id
// GET /api/quiz/render/:quizId
router.get("/render/:quizId", authenticateJWT, quizController.getQuizForRender);

// Get a single question by ID
// GET /api/quiz/questions/:id
router.get("/questions/:id", authenticateJWT, quizController.getQuestionById);

// Update a quiz question with optional file upload
// PUT /api/quiz/questions/:id
router.put("/questions/:id", authenticateJWT, uploadFields(), quizController.updateQuestion);

// Delete a quiz question
// DELETE /api/quiz/questions/:id
router.delete("/questions/:id", authenticateJWT, quizController.deleteQuestion);

// Submit student answer to a quiz question
// POST /api/quiz/submit-answer
router.post("/submit-answer", authenticateJWT, quizController.submitAnswer);

// Get student's quiz results
// GET /api/quiz/results/:contentItemId
router.get("/results/:contentItemId", authenticateJWT, quizController.getQuizResults);

module.exports = router;
