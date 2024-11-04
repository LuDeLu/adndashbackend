const userService = require('../services/userService');
const asyncHandler = require('../utils/asyncHandler');

const getAllUsers = asyncHandler(async (req, res) => {
  const users = await userService.getAllUsers();
  res.json(users);
});

const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { newRole } = req.body;
  await userService.updateUserRole(id, newRole);
  res.json({ message: 'User role updated successfully' });
});

module.exports = {
  getAllUsers,
  updateUserRole
};