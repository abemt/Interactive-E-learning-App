const express = require("express");
const router = express.Router();
const contentController = require("../Controllers/contentController");
const { authenticateJWT } = require("../Middleware/authMiddleware");
const { uploadSingle, uploadAny } = require("../Middleware/uploadMiddleware");

/**
 * Content Module Routes
 * All routes require authentication
 */

// Create a new module (Teachers/Admins only)
router.post("/modules", authenticateJWT, contentController.createModule);

// Get all modules for a class
router.get("/modules/class/:classId", authenticateJWT, contentController.getModulesByClass);

// Get lesson content items for a module
router.get("/modules/:moduleId/lessons", authenticateJWT, contentController.getLessonsByModule);

// Get modules assigned to authenticated student's class
router.get("/student/modules", authenticateJWT, contentController.getStudentAssignedModules);

// Get learning path grouped by quarter/term for authenticated student
router.get("/student/learning-path", authenticateJWT, contentController.getStudentLearningPath);

// Get immersive lesson payload for authenticated student
router.get("/student/lessons/:lessonId", authenticateJWT, contentController.getStudentLessonById);

// Mark lesson as completed for authenticated student and award XP
router.post("/student/lessons/:lessonId/complete", authenticateJWT, contentController.completeStudentLesson);

// Get classes assigned to authenticated teacher
router.get("/teacher/classes", authenticateJWT, contentController.getTeacherAssignedClasses);

// Get aggregated class analytics and roster for authenticated teacher
router.get("/teacher/analytics", authenticateJWT, contentController.getTeacherClassAnalytics);

// Lock/unlock a module or content item
router.put("/lock/:id", authenticateJWT, contentController.updateContentLockState);

// Get a single module by ID
router.get("/modules/:id", authenticateJWT, contentController.getModuleById);

// Update a module (Teachers/Admins only)
router.put("/modules/:id", authenticateJWT, contentController.updateModule);

// Delete a module (Teachers/Admins only)
router.delete("/modules/:id", authenticateJWT, contentController.deleteModule);

/**
 * Content Item Routes
 */

// Create a quiz content item with structured question data and optional media upload
router.post("/quiz", authenticateJWT, uploadSingle("media"), contentController.createQuizContentItem);

// Update quiz by providing quizId in request body
router.put("/quiz", authenticateJWT, uploadSingle("media"), contentController.updateQuizContentItem);

// Update a quiz content item and its question array in one transaction
router.put("/quiz/:quizId", authenticateJWT, uploadSingle("media"), contentController.updateQuizContentItem);

// Create a lesson content item with dynamic card media uploads (Teachers/Admins only)
router.post("/lesson", authenticateJWT, uploadAny(40), contentController.createLessonContentItem);

// Update a lesson content item with dynamic card media uploads (Teachers/Admins only)
router.put("/lesson/:lessonId", authenticateJWT, uploadAny(40), contentController.updateLessonContentItem);

// Create a new content item (Teachers/Admins only)
router.post("/items", authenticateJWT, contentController.createContentItem);

// Get all content items for a module
router.get("/items/module/:moduleId", authenticateJWT, contentController.getContentItemsByModule);

// Update a content item (Teachers/Admins only)
router.put("/items/:id", authenticateJWT, contentController.updateContentItem);

// Delete a content item (Teachers/Admins only)
router.delete("/items/:id", authenticateJWT, contentController.deleteContentItem);

module.exports = router;
