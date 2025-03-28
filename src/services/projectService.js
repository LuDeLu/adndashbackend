const { getPool } = require("../config/database")

class ProjectService {
  async getAllProjects() {
    const pool = getPool()
    try {
      const [rows] = await pool.query("SELECT * FROM projects ORDER BY name")
      return rows
    } catch (error) {
      console.error("Error getting projects:", error)
      throw new Error("Error getting projects: " + error.message)
    }
  }

  async getProjectById(id) {
    const pool = getPool()
    try {
      const [rows] = await pool.query("SELECT * FROM projects WHERE id = ?", [id])
      return rows[0]
    } catch (error) {
      console.error("Error getting project:", error)
      throw new Error("Error getting project: " + error.message)
    }
  }

  async createProject(projectData) {
    const pool = getPool()
    try {
      const [result] = await pool.query(
        `INSERT INTO projects 
         (name, image, edificio, location, available_units, reserved_units, sold_units, brochure, total_units, typologies) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          projectData.name,
          projectData.image,
          projectData.edificio,
          projectData.location,
          projectData.available_units || 0,
          projectData.reserved_units || 0,
          projectData.sold_units || 0,
          projectData.brochure,
          projectData.total_units || 0,
          projectData.typologies,
        ],
      )

      // Obtener el proyecto recién creado
      const [rows] = await pool.query("SELECT * FROM projects WHERE id = ?", [result.insertId])
      return rows[0]
    } catch (error) {
      console.error("Error creating project:", error)
      throw new Error("Error creating project: " + error.message)
    }
  }

  async updateProject(id, projectData) {
    const pool = getPool()
    try {
      // Actualizar los campos del proyecto
      await pool.query(
        `UPDATE projects SET 
         name = ?, 
         image = ?, 
         edificio = ?, 
         location = ?, 
         available_units = ?, 
         reserved_units = ?, 
         sold_units = ?, 
         brochure = ?, 
         total_units = ?, 
         typologies = ?,
         updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          projectData.name,
          projectData.image,
          projectData.edificio,
          projectData.location,
          projectData.available_units,
          projectData.reserved_units,
          projectData.sold_units,
          projectData.brochure,
          projectData.total_units,
          projectData.typologies,
          id,
        ],
      )

      // Obtener el proyecto actualizado
      const [rows] = await pool.query("SELECT * FROM projects WHERE id = ?", [id])
      return rows[0]
    } catch (error) {
      console.error("Error updating project:", error)
      throw new Error("Error updating project: " + error.message)
    }
  }

  async deleteProject(id) {
    const pool = getPool()
    try {
      await pool.query("DELETE FROM projects WHERE id = ?", [id])
    } catch (error) {
      console.error("Error deleting project:", error)
      throw new Error("Error deleting project: " + error.message)
    }
  }
}

module.exports = new ProjectService()

