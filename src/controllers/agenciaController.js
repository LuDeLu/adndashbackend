const { getPool } = require('../config/database');

const agenciaController = {
  getAllInmobiliarias: async (req, res) => {
    try {
      const pool = getPool();
      const [rows] = await pool.query('SELECT * FROM agenciasinmobiliarias');
      res.json(rows);
    } catch (error) {
      console.error('Error al obtener inmobiliarias:', error);
      res.status(500).json({ message: 'Error al obtener inmobiliarias' });
    }
  },

  getAllEmprendimientos: async (req, res) => {
    try {
      const pool = getPool();
      const [rows] = await pool.query('SELECT * FROM emprendimientos');
      res.json(rows);
    } catch (error) {
      console.error('Error al obtener emprendimientos:', error);
      res.status(500).json({ message: 'Error al obtener emprendimientos' });
    }
  }
};

module.exports = agenciaController;

