const {
  registerUser,
  loginUser,
  changePasswordForAuthenticatedUser
} = require("../Services/authService");

const AUTH_COOKIE_NAME = "token";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "12h";

const parseDurationToMs = (value) => {
  const normalized = String(value || "").trim().toLowerCase();

  if (/^\d+$/.test(normalized)) {
    return Number(normalized);
  }

  const match = normalized.match(/^(\d+)([smhd])$/);
  if (!match) {
    return 12 * 60 * 60 * 1000;
  }

  const amount = Number(match[1]);
  const unit = match[2];

  if (unit === "s") return amount * 1000;
  if (unit === "m") return amount * 60 * 1000;
  if (unit === "h") return amount * 60 * 60 * 1000;
  if (unit === "d") return amount * 24 * 60 * 60 * 1000;

  return 12 * 60 * 60 * 1000;
};

const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/",
  maxAge: parseDurationToMs(JWT_EXPIRES_IN)
};

const clearAuthCookieOptions = {
  path: "/",
  secure: authCookieOptions.secure,
  sameSite: authCookieOptions.sameSite
};

const setAuthCookie = (res, token) => {
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions);
};

const clearAuthCookie = (res) => {
  res.clearCookie(AUTH_COOKIE_NAME, clearAuthCookieOptions);
};

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const result = await registerUser(req.body);
    setAuthCookie(res, result.token);

    return res.status(201).json({
      success: true,
      message: result.message || "User registered successfully.",
      user: result.user
    });
  } catch (error) {
    return res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};

/**
 * Login existing user
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const result = await loginUser(req.body);
    setAuthCookie(res, result.token);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      user: result.user
    });
  } catch (error) {
    return res.status(401).json({ 
      success: false,
      message: error.message 
    });
  }
};

/**
 * Change authenticated user's password and clear first-login flag
 * POST /api/auth/change-password
 */
const changePassword = async (req, res) => {
  try {
    const result = await changePasswordForAuthenticatedUser({
      userId: req.user?.id,
      currentPassword: req.body?.currentPassword,
      newPassword: req.body?.newPassword,
      confirmNewPassword: req.body?.confirmNewPassword
    });

    setAuthCookie(res, result.token);

    return res.status(200).json({
      success: true,
      message: result.message,
      user: result.user
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      code: error.code || null,
      message: error.message
    });
  }
};

/**
 * Return the current authenticated user
 * GET /api/auth/me
 */
const me = async (req, res) =>
  res.status(200).json({
    success: true,
    user: req.user
  });

/**
 * Clear the authentication cookie
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  clearAuthCookie(res);

  return res.status(200).json({
    success: true,
    message: "Logged out successfully."
  });
};

module.exports = { register, login, changePassword, me, logout };
