const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/database');
const { JWT_SECRET } = require('../config/auth');

class AuthService {
  async login(email, password) {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (rows.length === 0) {
      throw new Error('Invalid credentials');
    }
    
    const user = rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }
    
    const token = this.generateToken(user);
    return { token, user: this.sanitizeUser(user) };
  }

  async googleLogin(email, name, googleId) {
    const pool = getPool();
    let [rows] = await pool.query('SELECT * FROM users WHERE email = ? OR google_id = ?', [email, googleId]);
    
    let user;
    if (rows.length === 0) {
      const [result] = await pool.query(
        'INSERT INTO users (email, nombre, google_id, rol) VALUES (?, ?, ?, ?)',
        [email, name, googleId, 'user']
      );
      user = { id: result.insertId, email, nombre: name, rol: 'user' };
    } else {
      user = rows[0];
      if (!user.google_id) {
        await pool.query('UPDATE users SET google_id = ? WHERE id = ?', [googleId, user.id]);
      }
    }

    const token = this.generateToken(user);
    return { token, user: this.sanitizeUser(user) };
  }

  generateToken(user) {
    return jwt.sign(
      { userId: user.id, email: user.email, rol: user.rol },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  }

  sanitizeUser(user) {
    const { id, email, nombre, rol } = user;
    return { id, email, nombre, rol };
  }
}

module.exports = new AuthService();