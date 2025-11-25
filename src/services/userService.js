const { getPool } = require('../config/database');

class UserService {
  async getAllUsers() {
    const pool = getPool();
    const [rows] = await pool.query('SELECT id, email, nombre, apellido, rol FROM users');
    return rows;
  }

  async updateUserRole(userId, newRole) {
    const pool = getPool();
    if (!['user', 'admin', 'superadmin'].includes(newRole)) {
      throw new Error('Invalid role');
    }
    await pool.query('UPDATE users SET rol = ? WHERE id = ?', [newRole, userId]);
  }
}

module.exports = new UserService();
