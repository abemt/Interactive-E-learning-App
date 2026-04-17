const express = require("express");
const multer = require("multer");
const { uploadContentBulk } = require("../Controllers/adminController");
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

module.exports = router;
