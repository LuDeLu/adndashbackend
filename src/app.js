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

const allowedOrigins = ['https://adndash.vercel.app', 'http://localhost:3000'];

// Configuración de CORS mejorada
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204
}));

// Configuración de encabezados de seguridad
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).end();
  }

  next();
});

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

// Middleware de manejo de errores mejorado
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Ha ocurrido un error en el servidor',
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
});

// Inicializar el pool de la base de datos
initializePool().catch(console.error);

console.log('Middleware y rutas configurados');

module.exports = app;

