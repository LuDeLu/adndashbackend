const { getPool } = require("../config/database")

// Default SVG paths for parking spots, matching the frontend
const DEFAULT_PARKING_SVG_PATHS = {
  P1: "M571,885 L640,1391 L737,1405 L817,1369 L753,869 L668,865 Z",
  P2: "M862,845 L926,1349 L1039,1373 L1120,1321 L1055,841 L1007,816 L951,824 L910,833 Z",
  P3: "M1164,811 L1221,1311 L1318,1319 L1394,1303 L1418,1255 L1350,779 L1245,783 Z",
  P4: "M1455,763 L1531,1271 L1636,1279 L1717,1243 L1644,730 Z",
  P5: "M1761,722 L1826,1227 L1911,1243 L2011,1214 L1943,694 Z",
  P6: "M2060,685 L2140,1193 L2229,1209 L2318,1177 L2253,660 Z",
  P7: "M2374,654 L2447,1150 L2544,1158 L2625,1122 L2552,625 Z",
  P8: "M2681,639 L2754,1107 L2850,1115 L2931,1083 L2862,578 L2681,607 Z",
  P9: "M2992,560 L3064,1064 L3165,1076 L3250,1036 L3169,535 Z",
  P10: "M3520,1198 L4020,1198 L4020,1384 L3520,1392 L3488,1307 Z",
  P11: "M3512,1497 L4020,1501 L4028,1670 L3524,1687 L3496,1586 Z",
  P12: "M1253,2522 L1435,2522 L1427,2009 L1338,1985 L1245,2017 Z",
  P13: "M1552,2013 L1552,2518 L1741,2522 L1729,2017 L1644,1989 Z",
}

class ParkingService {
  async getParkingSpotsByProjectId(projectId) {
    const pool = getPool()
    try {
      const [existingSpots] = await pool.query(
        "SELECT id, project_id, parking_id as parking_spot_code, level, status, assigned_to as assigned_to_apartment_code, svg_path FROM parking_spots WHERE project_id = ?",
        [projectId],
      )

      if (existingSpots.length > 0) {
        // Ensure all spots have an svg_path, falling back to default if necessary
        return existingSpots.map((spot) => ({
          ...spot,
          svg_path: spot.svg_path || DEFAULT_PARKING_SVG_PATHS[spot.parking_spot_code] || "",
        }))
      }

      // If no spots exist, create default ones (example for 13 spots on level 1)
      const defaultSpotsToCreate = []
      const totalDefaultSpots = 13 // As per DEFAULT_PARKING_SVG_PATHS
      const defaultLevel = 1

      for (let i = 1; i <= totalDefaultSpots; i++) {
        const parkingSpotCode = `P${i}`
        defaultSpotsToCreate.push({
          project_id: projectId,
          parking_spot_code: parkingSpotCode,
          level: defaultLevel,
          status: "libre",
          assigned_to_apartment_code: null,
          svg_path: DEFAULT_PARKING_SVG_PATHS[parkingSpotCode] || "", // Assign default SVG path
        })
      }

      const createdSpots = []
      for (const spotData of defaultSpotsToCreate) {
        const [result] = await pool.query(
          "INSERT INTO parking_spots (project_id, parking_id, level, status, assigned_to, svg_path) VALUES (?, ?, ?, ?, ?, ?)",
          [
            spotData.project_id,
            spotData.parking_spot_code, // parking_id in DB
            spotData.level,
            spotData.status,
            spotData.assigned_to_apartment_code, // assigned_to in DB
            spotData.svg_path,
          ],
        )
        createdSpots.push({
          id: result.insertId,
          project_id: spotData.project_id,
          parking_spot_code: spotData.parking_spot_code,
          level: spotData.level,
          status: spotData.status,
          assigned_to_apartment_code: spotData.assigned_to_apartment_code,
          svg_path: spotData.svg_path,
        })
      }
      return createdSpots
    } catch (error) {
      console.error("Error in getParkingSpotsByProjectId:", error)
      throw new Error("Error getting parking spots: " + error.message)
    }
  }

  async getParkingSpotById(spotDbId) {
    const pool = getPool()
    try {
      const [rows] = await pool.query(
        "SELECT id, project_id, parking_id as parking_spot_code, level, status, assigned_to as assigned_to_apartment_code, svg_path FROM parking_spots WHERE id = ?",
        [spotDbId],
      )
      if (rows.length > 0) {
        const spot = rows[0]
        return {
          ...spot,
          svg_path: spot.svg_path || DEFAULT_PARKING_SVG_PATHS[spot.parking_spot_code] || "",
        }
      }
      return null
    } catch (error) {
      console.error("Error in getParkingSpotById:", error)
      throw new Error("Error getting parking spot: " + error.message)
    }
  }

  async updateParkingSpot(spotDbId, spotData) {
    const pool = getPool()
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()

      // Ensure assigned_to_apartment_code is correctly formatted or null
      const assignedTo =
        spotData.assigned_to_apartment_code && spotData.assigned_to_apartment_code.includes("-")
          ? spotData.assigned_to_apartment_code
          : null

      await connection.query("UPDATE parking_spots SET status = ?, assigned_to = ? WHERE id = ?", [
        spotData.status,
        assignedTo, // Use the validated/formatted value
        spotDbId,
      ])

      // Log activity
      if (spotData.userId && spotData.projectId) {
        await connection.query(
          "INSERT INTO activity_logs (user_id, project_id, action_type, description) VALUES (?, ?, ?, ?)",
          [
            spotData.userId,
            spotData.projectId,
            spotData.status === "ocupado" ? "assign_parking" : "release_parking",
            spotData.description ||
              `${spotData.userName || "Usuario"} ${spotData.status === "ocupado" ? "asignó" : "liberó"} la cochera (ID: ${spotDbId})`,
          ],
        )
      }

      await connection.commit()
      return await this.getParkingSpotById(spotDbId)
    } catch (error) {
      await connection.rollback()
      console.error("Error in updateParkingSpot:", error)
      throw new Error("Error updating parking spot: " + error.message)
    } finally {
      connection.release()
    }
  }
}

module.exports = new ParkingService()
