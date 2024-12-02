const { getPool } = require('../config/database');
const fs = require('fs');
const path = require('path');

const projectController = {
  async createProject(req, res, next) {
    try {
      console.log('Iniciando creación de proyecto');
      console.log('Datos recibidos:', req.body);
      console.log('Archivo recibido:', req.file);

      const { name, location, image, edificio, available_units, reserved_units, sold_units } = req.body;
      const brochurePath = req.file ? `/uploads/${req.file.filename}` : null;
      const pool = getPool();
      
      console.log('Insertando en la base de datos');
      const [result] = await pool.query(
        'INSERT INTO projects (name, location, image, edificio, available_units, reserved_units, sold_units, brochure) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [name, location, image, edificio, available_units, reserved_units, sold_units, brochurePath]
      );
  
      console.log('Proyecto insertado con éxito');
      const newProject = {
        id: result.insertId,
        name,
        location,
        image,
        edificio,
        available_units,
        reserved_units,
        sold_units,
        brochure: brochurePath
      };
  
      res.status(201).json(newProject);
    } catch (error) {
      console.error('Error en createProject:', error);
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error al eliminar archivo:', err);
        });
      }
      next(error);
    }
  },
  
  async getAllProjects(req, res, next) {
    try {
      console.log('Obteniendo todos los proyectos');
      const pool = getPool();
      const [projects] = await pool.query(
        'SELECT * FROM projects ORDER BY created_at DESC'
      );
      console.log(`Se encontraron ${projects.length} proyectos`);
      res.json(projects);
    } catch (error) {
      console.error('Error en getAllProjects:', error);
      next(error);
    }
  },

  async updateProjectUnits(req, res, next) {
    try {
      console.log('Actualizando unidades del proyecto');
      const { id } = req.params;
      const { type, action } = req.body;
      console.log(`ID: ${id}, Tipo: ${type}, Acción: ${action}`);
      
      const pool = getPool();

      const updateQuery = `UPDATE projects SET ${type}_units = ${type}_units ${action === 'increment' ? '+' : '-'} 1 WHERE id = ?`;
      console.log('Query de actualización:', updateQuery);
      
      await pool.query(updateQuery, [id]);
      
      const [updatedProject] = await pool.query(
        'SELECT * FROM projects WHERE id = ?',
        [id]
      );

      if (!updatedProject[0]) {
        console.log('Proyecto no encontrado');
        return res.status(404).json({ message: 'Proyecto no encontrado' });
      }

      console.log('Proyecto actualizado:', updatedProject[0]);
      res.json(updatedProject[0]);
    } catch (error) {
      console.error('Error en updateProjectUnits:', error);
      next(error);
    }
  },

  async getBrochure(req, res, next) {
    try {
      console.log('Obteniendo brochure del proyecto');
      const { id } = req.params;
      console.log(`ID del proyecto: ${id}`);
      
      const pool = getPool();
      
      const [project] = await pool.query(
        'SELECT brochure FROM projects WHERE id = ?',
        [id]
      );

      if (!project[0] || !project[0].brochure) {
        console.log('Brochure no encontrado');
        return res.status(404).json({ message: 'Brochure no encontrado' });
      }

      const brochurePath = path.join(__dirname, '..', '..', project[0].brochure);
      console.log('Ruta del brochure:', brochurePath);
      
      res.sendFile(brochurePath);
    } catch (error) {
      console.error('Error en getBrochure:', error);
      next(error);
    }
  }
};

module.exports = projectController;