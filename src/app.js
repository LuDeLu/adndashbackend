require('dotenv').config();
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
const { setupApplication } = require('./server-setup');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://adndash.vercel.app',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json({ limit: '4gb' }));
app.use(express.urlencoded({ extended: true, limit: '4gb' }));

// Configuración de la aplicación
const { uploadsDir } = setupApplication();
app.use('/uploads', express.static(uploadsDir));

// Rutas
app.use('/api/clientes', clienteRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/users', userRoutes);
app.use('/api/agencias', agenciaRoutes);
app.use('/api/projects', projectRoutes);

// Middleware de manejo de errores debe ser el último
app.use(errorHandler);

// Inicializar el pool de la base de datos
initializePool().catch(console.error);

console.log('Middleware y rutas configurados');

module.exports = app;

