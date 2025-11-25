const { getPool } = require('../config/database');

class AgenciaService {
  async getAllAgenciasInmobiliarias() {
    const pool = getPool();
    try {
      const [rows] = await pool.query('SELECT * FROM agenciasinmobiliarias');
      return rows;
    } catch (error) {
      console.error('Error en getAllAgenciasInmobiliarias:', error);
      throw new Error('Error al obtener agencias inmobiliarias: ' + error.message);
    }
  }

  async getAllEmprendimientos() {
    const pool = getPool();
    try {
      const [rows] = await pool.query('SELECT * FROM emprendimientos');
      return rows;
    } catch (error) {
      console.error('Error en getAllEmprendimientos:', error);
      throw new Error('Error al obtener emprendimientos: ' + error.message);
    }
  }

  async getAllTipologias() {
    const pool = getPool();
    try {
      const [rows] = await pool.query('SELECT * FROM tipologias');
      return rows;
    } catch (error) {
      console.error('Error en getAllTipologias:', error);
      throw new Error('Error al obtener tipologías: ' + error.message);
    }
  }
}

module.exports = new AgenciaService();
