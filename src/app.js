const express = require('express');
const cors = require('cors');
const { initializePool } = require('./config/database');
const clienteRoutes = require('./routes/clienteRoutes');
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const userRoutes = require('./routes/userRoutes');
const agenciaRoutes = require('./routes/agenciaRoutes');
const projectRoutes = require('./routes/projectRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());


// Routes
app.use('/api/clientes', clienteRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/users', userRoutes);
app.use('/api/agencias', agenciaRoutes);
app.use('/api/projects', projectRoutes);


// Error handling middleware should be last
app.use(errorHandler);

// Initialize database pool
initializePool().catch(console.error);

// Aumentar el límite de tamaño del cuerpo de la solicitud
app.use(express.json({ limit: '4gb' }));
app.use(express.urlencoded({ extended: true, limit: '4gb' }));

console.log('Middleware and routes set up');

module.exports = app;