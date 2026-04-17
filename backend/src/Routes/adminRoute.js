const express = require("express");
const multer = require("multer");
const {
  uploadContentBulk,
  createClassroom,
  updateClassroom,
  deleteClassroom,
  listClassrooms,
  listManagedUsers,
  resetUserCredentials,
  linkParentToStudent,
  bulkImportUsers,
  listModulesForAssignment,
  listTeachersForAssignment,
  assignCoursesToClass,
  assignTeachersToClass
} = require("../Controllers/adminController");
const { authenticateJWT, authorizeRoles } = require("../Middleware/authMiddleware");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.post(
  "/bulk-upload/content-items",
  authenticateJWT,
  authorizeRoles("Admin"),
  upload.single("file"),
  uploadContentBulk
);

router.post(
  "/classes",
  authenticateJWT,
  authorizeRoles("Admin"),
  createClassroom
);

router.get(
  "/classes",
  authenticateJWT,
  authorizeRoles("Admin"),
  listClassrooms
);

router.put(
  "/classes/:classId",
  authenticateJWT,
  authorizeRoles("Admin"),
  updateClassroom
);

router.delete(
  "/classes/:classId",
  authenticateJWT,
  authorizeRoles("Admin"),
  deleteClassroom
);

router.get(
  "/modules",
  authenticateJWT,
  authorizeRoles("Admin"),
  listModulesForAssignment
);

router.get(
  "/teachers",
  authenticateJWT,
  authorizeRoles("Admin"),
  listTeachersForAssignment
);

router.put(
  "/classes/:classId/courses",
  authenticateJWT,
  authorizeRoles("Admin"),
  assignCoursesToClass
);

router.put(
  "/classes/:classId/teachers",
  authenticateJWT,
  authorizeRoles("Admin"),
  assignTeachersToClass
);

router.post(
  "/bulk-upload/users",
  authenticateJWT,
  authorizeRoles("Admin"),
  upload.single("file"),
  bulkImportUsers
);

router.get(
  "/users",
  authenticateJWT,
  authorizeRoles("Admin"),
  listManagedUsers
);

router.put(
  "/users/:userId/reset-credentials",
  authenticateJWT,
  authorizeRoles("Admin"),
  resetUserCredentials
);

router.post(
  "/link-parent",
  authenticateJWT,
  authorizeRoles("Admin"),
  linkParentToStudent
);

module.exports = router;
