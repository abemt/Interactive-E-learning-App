const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Op, fn, col, where } = require("sequelize");
const { User, LoginLog } = require("../models");
const { generateUniqueFamilyLinkCode } = require("./familyLinkCodeService");

const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret_change_me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "12h";
const STRONG_PASSWORD_MIN_LENGTH = 8;

const createServiceError = (message, statusCode = 400, code = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) {
    error.code = code;
  }
  return error;
};

const assertStrongPassword = (password) => {
  const value = String(password || "");

  if (value.length < STRONG_PASSWORD_MIN_LENGTH) {
    throw createServiceError(
      `New password must be at least ${STRONG_PASSWORD_MIN_LENGTH} characters long.`
    );
  }

  if (!/[a-z]/.test(value)) {
    throw createServiceError("New password must include at least one lowercase letter.");
  }

  if (!/[A-Z]/.test(value)) {
    throw createServiceError("New password must include at least one uppercase letter.");
  }

  if (!/\d/.test(value)) {
    throw createServiceError("New password must include at least one number.");
  }

  if (!/[^A-Za-z0-9]/.test(value)) {
    throw createServiceError("New password must include at least one special character.");
  }
};

const normalizeNamePart = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim();

const buildUsernameBase = (fullName, role, email) => {
  const namePart = normalizeNamePart(fullName).replace(/\s+/g, ".");
  const rolePrefix = String(role || "Student").slice(0, 1).toLowerCase() || "u";

  if (namePart) {
    return `${rolePrefix}.${namePart}`;
  }

  const emailLocalPart = String(email || "")
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "")
    .replace(/\.+/g, ".")
    .replace(/^\.+|\.+$/g, "");

  if (emailLocalPart) {
    return `${rolePrefix}.${emailLocalPart}`;
  }

  return `${rolePrefix}.user`;
};

const generateUniqueUsername = async (fullName, role, email) => {
  const base = buildUsernameBase(fullName, role, email);
  let candidate = base;
  let suffix = 2;

  while (true) {
    const existingUser = await User.findOne({
      where: { username: candidate },
      attributes: ["id"]
    });

    if (!existingUser) {
      return candidate;
    }

    candidate = `${base}${suffix}`;
    suffix += 1;
  }
};

const buildLoginEmailCandidates = (email) => {
  const base = String(email || "").trim().toLowerCase();
  const compact = base.replace(/\s+/g, "");
  const aroundAtTrimmed = base.replace(/\s*@\s*/g, "@");
  return [...new Set([base, aroundAtTrimmed, compact].filter(Boolean))];
};

const buildJwtPayload = (user) => ({
  sub: user.id,
  username: user.username,
  email: user.email,
  role: user.role,
  fullName: user.fullName,
  classId: user.classId,
  totalXP: user.totalXP || 0,
  needsPasswordChange: Boolean(user.needsPasswordChange)
});

const buildAuthUser = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  fullName: user.fullName,
  role: user.role,
  classId: user.classId,
  totalXP: user.totalXP || 0,
  familyLinkCode: user.familyLinkCode || null,
  needsPasswordChange: Boolean(user.needsPasswordChange)
});

/**
 * Register a new user with role-based access control
 * @param {Object} userData - User registration data
 * @param {string} userData.fullName - User's full name
 * @param {string} userData.email - User's email (unique)
 * @param {string} userData.password - User's password (will be hashed)
 * @param {string} userData.role - User role: Admin, Teacher, Student, or Parent
 * @returns {Promise<Object>} Created user and JWT token
 */
const registerUser = async ({ fullName, email, password, role = "Student", classId = null }) => {
  // Validation
  if (!fullName || !email || !password) {
    throw new Error("Full name, email, and password are required.");
  }

  if (!["Admin", "Teacher", "Student", "Parent"].includes(role)) {
    throw new Error("Invalid role. Must be Admin, Teacher, Student, or Parent.");
  }

  // Check if user already exists
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new Error("User with this email already exists.");
  }

  // Validate password strength
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }

  // Hash password with bcrypt
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);
  const username = await generateUniqueUsername(fullName, role, email);
  const familyLinkCode = role === "Student" ? await generateUniqueFamilyLinkCode() : null;

  // Create user
  const user = await User.create({
    fullName,
    username,
    email: email.toLowerCase(),
    passwordHash,
    role,
    classId: classId || null,
    familyLinkCode,
    needsPasswordChange: true
  });

  const payload = buildJwtPayload(user);
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  return {
    token,
    user: buildAuthUser(user),
    message: "User registered successfully"
  };
};

/**
 * Authenticate user and generate JWT token
 * @param {Object} credentials - Login credentials
 * @param {string} credentials.email - User's email
 * @param {string} credentials.password - User's password
 * @returns {Promise<Object>} User info and JWT token
 */
const loginUser = async ({ email, password }) => {
  if (!email || !password) {
    throw new Error("Email and password are required.");
  }

  const emailCandidates = buildLoginEmailCandidates(email);
  let user = await User.findOne({
    where: {
      email: {
        [Op.in]: emailCandidates
      }
    }
  });

  if (!user) {
    const compactEmail = String(email || "").trim().toLowerCase().replace(/\s+/g, "");
    user = await User.findOne({
      where: where(fn("REPLACE", col("email"), " ", ""), compactEmail)
    });
  }

  if (!user) {
    throw new Error("Invalid credentials.");
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error("Invalid credentials.");
  }

  const payload = buildJwtPayload(user);

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  await LoginLog.create({
    userId: user.id,
    loginAt: new Date()
  });

  return {
    token,
    user: buildAuthUser(user)
  };
};

const changePasswordForAuthenticatedUser = async ({
  userId,
  currentPassword,
  newPassword,
  confirmNewPassword
}) => {
  if (!userId) {
    throw createServiceError("Unauthorized request.", 401, "UNAUTHORIZED");
  }

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    throw createServiceError("Current password, new password, and confirmation are required.");
  }

  if (newPassword !== confirmNewPassword) {
    throw createServiceError("New password and confirmation do not match.");
  }

  assertStrongPassword(newPassword);

  const user = await User.findByPk(userId);
  if (!user) {
    throw createServiceError("User account not found.", 404, "USER_NOT_FOUND");
  }

  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isCurrentPasswordValid) {
    throw createServiceError("Current password is incorrect.", 401, "INVALID_CURRENT_PASSWORD");
  }

  const isSameAsCurrentPassword = await bcrypt.compare(newPassword, user.passwordHash);
  if (isSameAsCurrentPassword) {
    throw createServiceError("New password must be different from the current password.");
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.needsPasswordChange = false;
  await user.save();

  const payload = buildJwtPayload(user);
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  return {
    message: "Password updated successfully.",
    token,
    user: buildAuthUser(user)
  };
};

module.exports = { registerUser, loginUser, changePasswordForAuthenticatedUser };
