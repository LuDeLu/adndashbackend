const { getPool } = require("../config/database")

class FloorService {
  async getFloorsByProjectId(projectId) {
    const pool = getPool()
    try {
      // First check if floors exist for this project
      const [existingFloors] = await pool.query("SELECT * FROM floors WHERE project_id = ? ORDER BY floor_number", [
        projectId,
      ])

      // If floors exist, return them
      if (existingFloors.length > 0) {
        return existingFloors
      }

      // If no floors exist, create default floors (1-9) for this project
      const floors = []
      for (let i = 1; i <= 9; i++) {
        const viewBox = i === 9 ? "0 0 2220 1700" : i === 8 ? "0 0 3455 2250" : "0 0 3200 2400"
        const [result] = await pool.query("INSERT INTO floors (project_id, floor_number, view_box) VALUES (?, ?, ?)", [
          projectId,
          i,
          viewBox,
        ])

        floors.push({
          id: result.insertId,
          project_id: projectId,
          floor_number: i,
          view_box: viewBox,
        })
      }

      return floors
    } catch (error) {
      console.error("Error in getFloorsByProjectId:", error)
      throw new Error("Error getting floors: " + error.message)
    }
  }

  async getFloorById(floorId) {
    const pool = getPool()
    try {
      const [rows] = await pool.query("SELECT * FROM floors WHERE id = ?", [floorId])
      return rows[0] || null
    } catch (error) {
      console.error("Error in getFloorById:", error)
      throw new Error("Error getting floor: " + error.message)
    }
  }

  async getFloorByProjectAndNumber(projectId, floorNumber) {
    const pool = getPool()
    try {
      const [rows] = await pool.query("SELECT * FROM floors WHERE project_id = ? AND floor_number = ?", [
        projectId,
        floorNumber,
      ])
      return rows[0] || null
    } catch (error) {
      console.error("Error in getFloorByProjectAndNumber:", error)
      throw new Error("Error getting floor: " + error.message)
    }
  }

  async updateFloor(floorId, floorData) {
    const pool = getPool()
    try {
      await pool.query("UPDATE floors SET view_box = ? WHERE id = ?", [floorData.view_box, floorId])
      return await this.getFloorById(floorId)
    } catch (error) {
      console.error("Error in updateFloor:", error)
      throw new Error("Error updating floor: " + error.message)
    }
  }
}

module.exports = new FloorService()
