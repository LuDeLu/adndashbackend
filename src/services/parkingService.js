const { getPool } = require("../config/database")

class ParkingService {
  async getParkingSpotsByProjectId(projectId) {
    const pool = getPool()
    try {
      // First check if parking spots exist for this project
      const [existingSpots] = await pool.query(
        "SELECT * FROM parking_spots WHERE project_id = ? ORDER BY level, parking_id",
        [projectId],
      )

      // If parking spots exist, return them
      if (existingSpots.length > 0) {
        return existingSpots
      }

      // If no parking spots exist, create default spots for this project
      const parkingSpots = []
      const defaultPaths = this.getDefaultParkingPaths()

      // Create spots for level 1
      for (let i = 1; i <= defaultPaths.length; i++) {
        const [result] = await pool.query(
          `INSERT INTO parking_spots 
           (project_id, parking_id, level, status, svg_path) 
           VALUES (?, ?, ?, ?, ?)`,
          [projectId, `P${i}`, 1, "libre", defaultPaths[i - 1]],
        )

        parkingSpots.push({
          id: result.insertId,
          project_id: projectId,
          parking_id: `P${i}`,
          level: 1,
          status: "libre",
          assigned_to: null,
          svg_path: defaultPaths[i - 1],
        })
      }

      return parkingSpots
    } catch (error) {
      console.error("Error in getParkingSpotsByProjectId:", error)
      throw new Error("Error getting parking spots: " + error.message)
    }
  }

  async getParkingSpotById(spotId) {
    const pool = getPool()
    try {
      const [rows] = await pool.query("SELECT * FROM parking_spots WHERE id = ?", [spotId])
      return rows[0] || null
    } catch (error) {
      console.error("Error in getParkingSpotById:", error)
      throw new Error("Error getting parking spot: " + error.message)
    }
  }

  async updateParkingSpot(spotId, spotData) {
    const pool = getPool()
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      // Update parking spot data
      await connection.query(
        `UPDATE parking_spots 
         SET status = ?, assigned_to = ? 
         WHERE id = ?`,
        [spotData.status, spotData.assigned_to, spotId],
      )

      // Log the activity
      if (spotData.userId && spotData.projectId) {
        await connection.query(
          `INSERT INTO activity_logs 
           (user_id, project_id, action_type, description) 
           VALUES (?, ?, ?, ?)`,
          [
            spotData.userId,
            spotData.projectId,
            spotData.status === "ocupado" ? "assign_parking" : "unassign_parking",
            spotData.description ||
              `${spotData.userName || "Usuario"} ${spotData.status === "ocupado" ? "asignó" : "desasignó"} la cochera ${spotData.parkingId} ${spotData.status === "ocupado" ? "al" : "del"} departamento ${spotData.assigned_to || ""}`,
          ],
        )
      }

      await connection.commit()
      return await this.getParkingSpotById(spotId)
    } catch (error) {
      await connection.rollback()
      console.error("Error in updateParkingSpot:", error)
      throw new Error("Error updating parking spot: " + error.message)
    } finally {
      connection.release()
    }
  }

  async assignMultipleParkingSpots(projectId, apartmentId, parkingIds, userId, userName) {
    const pool = getPool()
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      // Get current assigned spots for this apartment
      const [currentAssignedSpots] = await connection.query(
        "SELECT id, parking_id FROM parking_spots WHERE project_id = ? AND assigned_to = ?",
        [projectId, apartmentId],
      )

      // Spots to unassign (currently assigned but not in the new list)
      const spotsToUnassign = currentAssignedSpots.filter((spot) => !parkingIds.includes(spot.parking_id))

      // Unassign spots
      for (const spot of spotsToUnassign) {
        await connection.query("UPDATE parking_spots SET status = 'libre', assigned_to = NULL WHERE id = ?", [spot.id])

        // Log unassignment
        await connection.query(
          `INSERT INTO activity_logs 
           (user_id, project_id, action_type, description) 
           VALUES (?, ?, ?, ?)`,
          [
            userId,
            projectId,
            "unassign_parking",
            `${userName || "Usuario"} desasignó la cochera ${spot.parking_id} del departamento ${apartmentId}`,
          ],
        )
      }

      // Assign new spots
      for (const parkingId of parkingIds) {
        // Check if spot exists and is not already assigned to this apartment
        const [spotRows] = await connection.query(
          "SELECT id, status, assigned_to FROM parking_spots WHERE project_id = ? AND parking_id = ?",
          [projectId, parkingId],
        )

        if (spotRows.length > 0) {
          const spot = spotRows[0]

          // Only update if not already assigned to this apartment
          if (spot.assigned_to !== apartmentId) {
            await connection.query("UPDATE parking_spots SET status = 'ocupado', assigned_to = ? WHERE id = ?", [
              apartmentId,
              spot.id,
            ])

            // Log assignment
            await connection.query(
              `INSERT INTO activity_logs 
               (user_id, project_id, action_type, description) 
               VALUES (?, ?, ?, ?)`,
              [
                userId,
                projectId,
                "assign_parking",
                `${userName || "Usuario"} asignó la cochera ${parkingId} al departamento ${apartmentId}`,
              ],
            )
          }
        }
      }

      await connection.commit()
      return true
    } catch (error) {
      await connection.rollback()
      console.error("Error in assignMultipleParkingSpots:", error)
      throw new Error("Error assigning parking spots: " + error.message)
    } finally {
      connection.release()
    }
  }

  getDefaultParkingPaths() {
    return [
      "M571,885 L640,1391 L737,1405 L817,1369 L753,869 L668,865 Z",
      "M862,845 L926,1349 L1039,1373 L1120,1321 L1055,841 L1007,816 L951,824 L910,833 Z",
      "M1164,811 L1221,1311 L1318,1319 L1394,1303 L1418,1255 L1350,779 L1245,783 Z",
      "M1455,763 L1531,1271 L1636,1279 L1717,1243 L1644,730 Z",
      "M1761,722 L1826,1227 L1911,1243 L2011,1214 L1943,694 Z",
      "M2060,685 L2140,1193 L2229,1209 L2318,1177 L2253,660 Z",
      "M2374,654 L2447,1150 L2544,1158 L2625,1122 L2552,625 Z",
      "M2681,639 L2754,1107 L2850,1115 L2931,1083 L2862,578 L2681,607 Z",
      "M2992,560 L3064,1064 L3165,1076 L3250,1036 L3169,535 Z",
      "M3520,1198 L4020,1198 L4020,1384 L3520,1392 L3488,1307 Z",
      "M3512,1497 L4020,1501 L4028,1670 L3524,1687 L3496,1586 Z",
      "M1253,2522 L1435,2522 L1427,2009 L1338,1985 L1245,2017 Z",
      "M1552,2013 L1552,2518 L1741,2522 L1729,2017 L1644,1989 Z",
    ]
  }
}

module.exports = new ParkingService()
