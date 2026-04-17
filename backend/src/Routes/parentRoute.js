const express = require("express");
const { getChildren, linkChildByCode } = require("../Controllers/parentController");
const { authenticateJWT, authorizeRoles } = require("../Middleware/authMiddleware");

const router = express.Router();

router.get(
  "/children",
  authenticateJWT,
  authorizeRoles("Parent"),
  getChildren
);

router.post(
  "/link-code",
  authenticateJWT,
  authorizeRoles("Parent"),
  linkChildByCode
);

module.exports = router;