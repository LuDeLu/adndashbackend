const { getPool } = require('../config/database');

class ClienteService {
  async getAllClientes() {
    const pool = getPool();
    try {
      const [rows] = await pool.query(`
        SELECT c.*, 
          GROUP_CONCAT(DISTINCT e.id) AS emprendimientos,
          GROUP_CONCAT(DISTINCT t.id) AS tipologias
        FROM clientes c
        LEFT JOIN ClienteEmprendimiento ce ON c.id = ce.cliente_id
        LEFT JOIN emprendimientos e ON ce.emprendimiento_id = e.id
        LEFT JOIN ClienteTipologia ct ON c.id = ct.cliente_id
        LEFT JOIN tipologias t ON ct.tipologia_id = t.id
        GROUP BY c.id
      `);
      
      console.log('Consulta SQL completada, número de clientes obtenidos:', rows.length);
      
      return rows.map(row => ({
        ...row,
        emprendimientos: row.emprendimientos ? row.emprendimientos.split(',').map(Number) : [],
        tipologias: row.tipologias ? row.tipologias.split(',').map(Number) : []
      }));
    } catch (error) {
      console.error('Error en getAllClientes:', error);
      throw new Error('Error al obtener los clientes: ' + error.message);
    }
  }

  async createCliente(clienteData) {
    const pool = getPool();
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Separate the junction table data from the main cliente data
      const { emprendimientos, tipologias, ...clienteBasicData } = clienteData;
      
      // Insert only the basic cliente data
      const [result] = await connection.query(
        `INSERT INTO Clientes SET ?`,
        [clienteBasicData]
      );
      
      const clienteId = result.insertId;
      
      // Insert the relationships if they exist
      if (emprendimientos?.length) {
        await this.insertEmprendimientos(connection, clienteId, emprendimientos);
      }
      
      if (tipologias?.length) {
        await this.insertTipologias(connection, clienteId, tipologias);
      }
      
      await connection.commit();
      return clienteId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateCliente(id, clienteData) {
    const pool = getPool();
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Separate the junction table data from the main cliente data
      const { emprendimientos, tipologias, ...clienteBasicData } = clienteData;
      
      await connection.query(
        `UPDATE Clientes SET ? WHERE id = ?`,
        [clienteBasicData, id]
      );
      
      await connection.query('DELETE FROM ClienteEmprendimiento WHERE cliente_id = ?', [id]);
      await connection.query('DELETE FROM ClienteTipologia WHERE cliente_id = ?', [id]);
      
      if (emprendimientos?.length) {
        await this.insertEmprendimientos(connection, id, emprendimientos);
      }
      
      if (tipologias?.length) {
        await this.insertTipologias(connection, id, tipologias);
      }
      
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async deleteCliente(id) {
    const pool = getPool();
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      await connection.query('DELETE FROM ClienteEmprendimiento WHERE cliente_id = ?', [id]);
      await connection.query('DELETE FROM ClienteTipologia WHERE cliente_id = ?', [id]);
      await connection.query('DELETE FROM Clientes WHERE id = ?', [id]);
      
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateContactDates(id, { ultimo_contacto, proximo_contacto }) {
    const pool = getPool();
    await pool.query(
      'UPDATE Clientes SET ultimo_contacto = ?, proximo_contacto = ? WHERE id = ?',
      [ultimo_contacto, proximo_contacto, id]
    );
  }

  async insertEmprendimientos(connection, clienteId, emprendimientos) {
    const values = emprendimientos.map(empId => [clienteId, empId]);
    await connection.query(
      'INSERT INTO ClienteEmprendimiento (cliente_id, emprendimiento_id) VALUES ?',
      [values]
    );
  }

  async insertTipologias(connection, clienteId, tipologias) {
    const values = tipologias.map(tipId => [clienteId, tipId]);
    await connection.query(
      'INSERT INTO ClienteTipologia (cliente_id, tipologia_id) VALUES ?',
      [values]
    );
  }
}

module.exports = new ClienteService();

