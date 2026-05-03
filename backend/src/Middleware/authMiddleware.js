const jwt = require("jsonwebtoken");
const { User } = require("../models");

const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret_change_me";

const isPasswordChangeEndpoint = (req) => req.baseUrl === "/api/auth" && req.path === "/change-password";
const isSessionCheckEndpoint = (req) => req.baseUrl === "/api/auth" && req.path === "/me";

const authenticateJWT = async (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: "Missing session token." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id ?? decoded.sub;

    if (!userId) {
      return res.status(401).json({ message: "Invalid token payload." });
    }

    const currentUser = await User.findByPk(userId, {
      attributes: [
        "id",
        "username",
        "email",
        "role",
        "fullName",
        "classId",
        "totalXP",
        "needsPasswordChange"
      ]
    });

    if (!currentUser) {
      return res.status(401).json({ message: "User account no longer exists." });
    }

    req.user = {
      ...decoded,
      id: currentUser.id,
      username: currentUser.username,
      email: currentUser.email,
      role: currentUser.role,
      fullName: currentUser.fullName,
      classId: currentUser.classId,
      totalXP: currentUser.totalXP,
      needsPasswordChange: Boolean(currentUser.needsPasswordChange)
    };

    if (req.user.needsPasswordChange && !isPasswordChangeEndpoint(req) && !isSessionCheckEndpoint(req)) {
      return res.status(403).json({
        success: false,
        code: "PASSWORD_CHANGE_REQUIRED",
        message: "Password change required. Please update your temporary password before continuing."
      });
    }

    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

const authorizeRoles = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: "Forbidden: insufficient role." });
  }

  return next();
};

module.exports = { authenticateJWT, authorizeRoles };
