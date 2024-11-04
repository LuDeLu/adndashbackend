const { getPool } = require('../config/database');

class AgenciaService {
  async getAllAgenciasInmobiliarias() {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM agenciasinmobiliarias');
    return rows;
  }

  async getAllEmprendimientos() {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM emprendimientos');
    return rows;
  }

  async getAllTipologias() {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM tipologias');
    return rows;
  }
}

module.exports = new AgenciaService();