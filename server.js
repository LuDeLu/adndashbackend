const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());

const dbConfig = {
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'adndash',
};

let pool;
async function initializePool() {
  pool = mysql.createPool(dbConfig);
}
initializePool();

const GOOGLE_CLIENT_ID = '373681027354-rjlbr8uhb7ltni7fd5ljjmm070g56pen.apps.googleusercontent.com';
const JWT_SECRET = '8c6b1cc7a8bc3e905f23962a75744b6f7080aceeda3498f9a9f68c8c8b0dfb65239a5ec6823ae6c9aa7cd44fb6689589f00d093bed0cad8b12a6d16b5073a1e5'; 
// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};
// API endpoints
app.get('/api/clientes', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.*, 
        GROUP_CONCAT(DISTINCT e.id) AS emprendimientos,
        GROUP_CONCAT(DISTINCT t.id) AS tipologias
      FROM Clientes c
      LEFT JOIN ClienteEmprendimiento ce ON c.id = ce.cliente_id
      LEFT JOIN emprendimientos e ON ce.emprendimiento_id = e.id
      LEFT JOIN ClienteTipologia ct ON c.id = ct.cliente_id
      LEFT JOIN tipologias t ON ct.tipologia_id = t.id
      GROUP BY c.id
    `);
    res.json(rows.map(row => ({
      ...row,
      emprendimientos: row.emprendimientos ? row.emprendimientos.split(',').map(Number) : [],
      tipologias: row.tipologias ? row.tipologias.split(',').map(Number) : []
    })));
  } catch (error) {
    console.error('Error fetching clientes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/clientes', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { 
      nombre, apellido, tipo, agencia_inmobiliaria_id, caracteristica, 
      telefono, email, como_nos_conocio, metros_min, metros_max, 
      precio_min, precio_max, rango_edad, estado, dato_extra,
      emprendimientos, tipologias
    } = req.body;
    const [result] = await connection.query(
      `INSERT INTO Clientes (
        nombre, apellido, tipo, agencia_inmobiliaria_id, caracteristica, 
        telefono, email, como_nos_conocio, metros_min, metros_max, 
        precio_min, precio_max, rango_edad, estado, dato_extra
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, apellido, tipo, agencia_inmobiliaria_id, caracteristica, 
       telefono, email, como_nos_conocio, metros_min, metros_max, 
       precio_min, precio_max, rango_edad, estado, dato_extra]
    );
    const clienteId = result.insertId;
    // Insert emprendimientos
    if (emprendimientos && emprendimientos.length > 0) {
      await connection.query(
        `INSERT INTO ClienteEmprendimiento (cliente_id, emprendimiento_id) VALUES ${emprendimientos.map(() => '(?, ?)').join(', ')}`,
        emprendimientos.flatMap(empId => [clienteId, empId])
      );
    }
    // Insert tipologias
    if (tipologias && tipologias.length > 0) {
      await connection.query(
        `INSERT INTO ClienteTipologia (cliente_id, tipologia_id) VALUES ${tipologias.map(() => '(?, ?)').join(', ')}`,
        tipologias.flatMap(tipId => [clienteId, tipId])
      );
    }
    await connection.commit();
    res.status(201).json({ id: clienteId, message: 'Cliente created successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating cliente:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

app.put('/api/clientes/:id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    const { 
      nombre, apellido, tipo, agencia_inmobiliaria_id, caracteristica, 
      telefono, email, como_nos_conocio, metros_min, metros_max, 
      precio_min, precio_max, rango_edad, estado, dato_extra,
      emprendimientos, tipologias
    } = req.body;
    await connection.query(
      `UPDATE Clientes SET 
        nombre = ?, apellido = ?, tipo = ?, agencia_inmobiliaria_id = ?, 
        caracteristica = ?, telefono = ?, email = ?, como_nos_conocio = ?, 
        metros_min = ?, metros_max = ?, precio_min = ?, precio_max = ?, 
        rango_edad = ?, estado = ?, dato_extra = ? 
      WHERE id = ?`,
      [nombre, apellido, tipo, agencia_inmobiliaria_id, caracteristica, 
       telefono, email, como_nos_conocio, metros_min, metros_max, 
       precio_min, precio_max, rango_edad, estado, dato_extra, id]
    );
    // Update emprendimientos
    await connection.query('DELETE FROM ClienteEmprendimiento WHERE cliente_id = ?', [id]);
    if (emprendimientos && emprendimientos.length > 0) {
      await connection.query(
        `INSERT INTO ClienteEmprendimiento (cliente_id, emprendimiento_id) VALUES ${emprendimientos.map(() => '(?, ?)').join(', ')}`,
        emprendimientos.flatMap(empId => [id, empId])
      );
    }
    // Update tipologias
    await connection.query('DELETE FROM ClienteTipologia WHERE cliente_id = ?', [id]);
    if (tipologias && tipologias.length > 0) {
      await connection.query(
        `INSERT INTO ClienteTipologia (cliente_id, tipologia_id) VALUES ${tipologias.map(() => '(?, ?)').join(', ')}`,
        tipologias.flatMap(tipId => [id, tipId])
      );
    }
    await connection.commit();
    res.status(200).json({ message: 'Cliente updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating cliente:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

app.delete('/api/clientes/:id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    await connection.query('DELETE FROM ClienteEmprendimiento WHERE cliente_id = ?', [id]);
    await connection.query('DELETE FROM ClienteTipologia WHERE cliente_id = ?', [id]);
    await connection.query('DELETE FROM Clientes WHERE id = ?', [id]);
    await connection.commit();
    res.status(200).json({ message: 'Cliente deleted successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error deleting cliente:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

app.get('/api/agenciasinmobiliarias', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM agenciasinmobiliarias');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching agencias inmobiliarias:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/emprendimientos', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM emprendimientos');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching emprendimientos:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/tipologias', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM tipologias');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching tipologias:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/clientes/:id', async (req, res) => {
  const { id } = req.params;
  const { ultimo_contacto, proximo_contacto } = req.body;
  try {
    await pool.query(
      'UPDATE Clientes SET ultimo_contacto = ?, proximo_contacto = ? WHERE id = ?',
      [ultimo_contacto, proximo_contacto, id]
    );
    res.status(200).json({ message: 'Fechas de contacto actualizadas con éxito' });
  } catch (error) {
    console.error('Error updating contact dates:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Authentication endpoints
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user.id, email: user.email, rol: user.rol }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/google-login', async (req, res) => {
  const { email, name, googleId } = req.body;
  try {
    let [rows] = await pool.query('SELECT * FROM users WHERE email = ? OR google_id = ?', [email, googleId]);
    
    let user;
    if (rows.length === 0) {
      // Create new user
      const [result] = await pool.query(
        'INSERT INTO users (email, nombre, google_id, rol) VALUES (?, ?, ?, ?)',
        [email, name, googleId, 'user']
      );
      user = { id: result.insertId, email, nombre: name, rol: 'user' };
    } else {
      user = rows[0];
      // Update existing user's Google ID if not set
      if (!user.google_id) {
        await pool.query('UPDATE users SET google_id = ? WHERE id = ?', [googleId, user.id]);
      }
    }

    const token = jwt.sign({ userId: user.id, email: user.email, rol: user.rol }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol } });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.get('/api/events', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM events WHERE user_id = ?', [req.user.userId]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/events', authenticateToken, async (req, res) => {
  const { title, client, start, end, googleEventId } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO events (user_id, title, client, start, end, google_event_id) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.userId, title, client, new Date(start), new Date(end), googleEventId]
    );
    res.status(201).json({ id: result.insertId, message: 'Event created successfully' });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/events/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { title, client, start, end, completed, reminded, googleEventId } = req.body;
  try {
    await pool.query(
      'UPDATE events SET title = ?, client = ?, start = ?, end = ?, completed = ?, reminded = ?, google_event_id = ? WHERE id = ? AND user_id = ?',
      [title, client, new Date(start), new Date(end), completed, reminded, googleEventId, id, req.user.userId]
    );
    res.json({ message: 'Event updated successfully' });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/events/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM events WHERE id = ? AND user_id = ?', [id, req.user.userId]);
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// New endpoint to fetch all users
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    // Only allow admin and superadmin to access this endpoint
    if (req.user.rol !== 'admin' && req.user.rol !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [rows] = await pool.query('SELECT id, email, nombre, apellido, rol FROM users');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// New endpoint to update user role
app.patch('/api/users/:id/role', authenticateToken, async (req, res) => {
  try {
    // Only allow admin and superadmin to access this endpoint
    if (req.user.rol !== 'admin' && req.user.rol !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { id } = req.params;
    const { newRole } = req.body;

    // Validate newRole
    if (!['user', 'admin', 'superadmin'].includes(newRole)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    await pool.query('UPDATE users SET rol = ? WHERE id = ?', [newRole, id]);
    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

console.log('Server started with:');
console.log('GOOGLE_CLIENT_ID:', GOOGLE_CLIENT_ID);
console.log('JWT_SECRET:', JWT_SECRET);