const {
  registerUser,
  loginUser,
  changePasswordForAuthenticatedUser
} = require("../Services/authService");

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const result = await registerUser(req.body);
    return res.status(201).json(result);
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
    return res.status(200).json(result);
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

    return res.status(200).json({
      success: true,
      ...result
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

module.exports = { register, login, changePassword };
