const { getPool } = require('../config/database');

class PostVentaService {
  // Función auxiliar para convertir campos a JSON
  _convertToJSON(data, fields) {
    fields.forEach(field => {
      if (data[field] && typeof data[field] === 'object') {
        data[field] = JSON.stringify(data[field]);
      }
    });
  }

  // Función auxiliar para parsear campos JSON
  _parseJSON(data, fields) {
    fields.forEach(field => {
      if (data[field] && typeof data[field] === 'string') {
        try {
          data[field] = JSON.parse(data[field]);
        } catch (error) {
          console.error(`Error parsing JSON for field ${field}:`, error);
          data[field] = null;
        }
      }
    });
  }

  async createReclamo(reclamoData) {
    const pool = getPool();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      this._convertToJSON(reclamoData, ['inspeccion', 'ordenTrabajo', 'actaConformidad']);
      
      const [result] = await connection.query(
        'INSERT INTO reclamos SET ?',
        [reclamoData]
      );
      
      const reclamoId = result.insertId;
      
      await connection.commit();
      return { id: reclamoId, ...reclamoData };
    } catch (error) {
      await connection.rollback();
      throw new Error('Error al crear el reclamo: ' + error.message);
    } finally {
      connection.release();
    }
  }

  async getAllReclamos() {
    const pool = getPool();
    try {
      const [rows] = await pool.query('SELECT * FROM reclamos');
      rows.forEach(row => this._parseJSON(row, ['inspeccion', 'ordenTrabajo', 'actaConformidad']));
      return rows;
    } catch (error) {
      throw new Error('Error al obtener los reclamos: ' + error.message);
    }
  }

  async getReclamoById(id) {
    const pool = getPool();
    try {
      const [rows] = await pool.query('SELECT * FROM reclamos WHERE id = ?', [id]);
      if (rows[0]) {
        this._parseJSON(rows[0], ['inspeccion', 'ordenTrabajo', 'actaConformidad']);
      }
      return rows[0];
    } catch (error) {
      throw new Error('Error al obtener el reclamo: ' + error.message);
    }
  }

  async updateReclamo(id, reclamoData) {
    const pool = getPool();
    try {
      this._convertToJSON(reclamoData, ['inspeccion', 'ordenTrabajo', 'actaConformidad']);
      
      const [result] = await pool.query(
        'UPDATE reclamos SET ? WHERE id = ?',
        [reclamoData, id]
      );
      if (result.affectedRows === 0) {
        return null;
      }
      // Obtener el reclamo actualizado
      const [updatedRows] = await pool.query('SELECT * FROM reclamos WHERE id = ?', [id]);
      const updatedReclamo = updatedRows[0];
      this._parseJSON(updatedReclamo, ['inspeccion', 'ordenTrabajo', 'actaConformidad']);
      return updatedReclamo;
    } catch (error) {
      throw new Error('Error al actualizar el reclamo: ' + error.message);
    }
  }

  async deleteReclamo(id) {
    const pool = getPool();
    try {
      const [result] = await pool.query('DELETE FROM reclamos WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('Error al eliminar el reclamo: ' + error.message);
    }
  }
}

module.exports = new PostVentaService();