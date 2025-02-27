const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  res.json(result);
});

const googleLogin = asyncHandler(async (req, res) => {
  const { email, name, googleId } = req.body;
  const result = await authService.googleLogin(email, name, googleId);
  res.json(result);
});

module.exports = {
  login,
  googleLogin
};