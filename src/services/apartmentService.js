const { getPool } = require("../config/database")

class ApartmentService {
  async getApartmentsByFloorId(floorId) {
    const pool = getPool()
    try {
      // First check if apartments exist for this floor
      const [existingApartments] = await pool.query("SELECT * FROM apartments WHERE floor_id = ?", [floorId])

      // If apartments exist, return them
      if (existingApartments.length > 0) {
        return existingApartments
      }

      // Get floor info to determine which default apartments to create
      const [floorRows] = await pool.query("SELECT * FROM floors WHERE id = ?", [floorId])
      if (floorRows.length === 0) {
        throw new Error("Floor not found")
      }

      const floor = floorRows[0]
      const floorNumber = floor.floor_number

      // Create default apartments based on floor number
      const apartments = []
      let apartmentIds = []

      if (floorNumber === 9) {
        apartmentIds = ["9A", "9B"]
      } else if (floorNumber === 8) {
        apartmentIds = ["8A", "8B", "8C"]
      } else {
        apartmentIds = [`${floorNumber}A`, `${floorNumber}B`, `${floorNumber}C`]
      }

      // Default SVG paths based on floor number
      const svgPaths = this.getDefaultSvgPaths(floorNumber)

      // Insert default apartments
      for (const apartmentId of apartmentIds) {
        const price = this.getDefaultPrice(apartmentId)
        const surface = this.getDefaultSurface(apartmentId)
        const status = this.getDefaultStatus(apartmentId)
        const buyer = status === "ocupado" ? this.getDefaultBuyer(apartmentId) : null
        const reservationDate = status === "ocupado" || status === "reservado" ? this.getDefaultDate(apartmentId) : null

        const [result] = await pool.query(
          `INSERT INTO apartments 
           (floor_id, apartment_id, status, price, surface, buyer, reservation_date, svg_path) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [floorId, apartmentId, status, price, surface, buyer, reservationDate, svgPaths[apartmentId]],
        )

        apartments.push({
          id: result.insertId,
          floor_id: floorId,
          apartment_id: apartmentId,
          status,
          price,
          surface,
          buyer,
          reservation_date: reservationDate,
          svg_path: svgPaths[apartmentId],
        })
      }

      return apartments
    } catch (error) {
      console.error("Error in getApartmentsByFloorId:", error)
      throw new Error("Error getting apartments: " + error.message)
    }
  }

  async getApartmentById(apartmentId) {
    const pool = getPool()
    try {
      const [rows] = await pool.query("SELECT * FROM apartments WHERE id = ?", [apartmentId])
      return rows[0] || null
    } catch (error) {
      console.error("Error in getApartmentById:", error)
      throw new Error("Error getting apartment: " + error.message)
    }
  }

  async updateApartment(apartmentId, apartmentData) {
    const pool = getPool()
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      // Update apartment data
      await connection.query(
        `UPDATE apartments 
         SET status = ?, price = ?, buyer = ?, phone = ?, email = ?, reservation_date = ? 
         WHERE id = ?`,
        [
          apartmentData.status,
          apartmentData.price,
          apartmentData.buyer || null,
          apartmentData.phone || null,
          apartmentData.email || null,
          apartmentData.status === "libre"
            ? null
            : apartmentData.reservation_date || new Date().toISOString().split("T")[0],
          apartmentId,
        ],
      )

      // Log the activity
      if (apartmentData.userId && apartmentData.projectId) {
        await connection.query(
          `INSERT INTO activity_logs 
           (user_id, project_id, action_type, description) 
           VALUES (?, ?, ?, ?)`,
          [
            apartmentData.userId,
            apartmentData.projectId,
            this.getActionType(apartmentData.status),
            apartmentData.description ||
              `${apartmentData.userName || "Usuario"} cambió el estado del departamento ${apartmentData.apartmentId} a ${apartmentData.status}`,
          ],
        )
      }

      await connection.commit()
      return await this.getApartmentById(apartmentId)
    } catch (error) {
      await connection.rollback()
      console.error("Error in updateApartment:", error)
      throw new Error("Error updating apartment: " + error.message)
    } finally {
      connection.release()
    }
  }

  async getActivityLogsByProjectId(projectId) {
    const pool = getPool()
    try {
      const [rows] = await pool.query(
        `SELECT al.*, u.nombre as user_name 
         FROM activity_logs al
         LEFT JOIN users u ON al.user_id = u.id
         WHERE al.project_id = ?
         ORDER BY al.created_at DESC
         LIMIT 50`,
        [projectId],
      )
      return rows
    } catch (error) {
      console.error("Error in getActivityLogsByProjectId:", error)
      throw new Error("Error getting activity logs: " + error.message)
    }
  }

  // Helper methods for default data
  getDefaultSvgPaths(floorNumber) {
    const svgPaths = {
      // Floor 1
      "1A": "M136,509 L126,2004 L764,2001 L767,1918 L1209,1915 L1207,1999 L1218,2001 L1221,1692 L1635,1692 L1639,1544 L1224,1543 L1227,1291 L1430,1292 L1424,899 L1219,902 L1216,578 L506,575 L504,455 Z",
      "1B": "M3111,2317 L1421,2314 L1418,2007 L1209,2004 L1209,1680 L1635,1683 L2078,1683 L2084,1270 L3117,1270 Z",
      "1C": "M3111,1276 L3114,300 L2298,303 L2304,214 L1206,366 L1212,904 L1415,910 L1418,1288 L1674,1291 L1677,1115 L1879,1109 L1879,1285 Z",

      // Floors 2-7 (same paths)
      "2A": "M138,2013 L1224,2019 L1221,1704 L1638,1716 L1638,1555 L1221,1552 L1224,1303 L1424,1300 L1421,913 L1224,904 L1215,232 L168,372 L171,396 L207,396 L204,514 L135,526 Z",
      "2B": "M3111,2325 L1418,2325 L1421,2016 L1215,2013 L1227,1701 L2075,1698 L2087,1294 L3253,1291 L3259,2290 L3230,2290 L3230,2260 L3114,2260 Z",
      "2C": "M1882,1300 L3248,1294 L3259,749 L3242,755 L3239,794 L3117,791 L3123,83 L3096,80 L3096,113 L1912,277 L1915,158 L1959,155 L1953,128 L1209,232 L1218,907 L1424,916 L1418,1300 L1671,1294 L1671,1124 L1876,1130 Z",
      "3A": "M138,2013 L1224,2019 L1221,1704 L1638,1716 L1638,1555 L1221,1552 L1224,1303 L1424,1300 L1421,913 L1224,904 L1215,232 L168,372 L171,396 L207,396 L204,514 L135,526 Z",
      "3B": "M3111,2325 L1418,2325 L1421,2016 L1215,2013 L1227,1701 L2075,1698 L2087,1294 L3253,1291 L3259,2290 L3230,2290 L3230,2260 L3114,2260 Z",
      "3C": "M1882,1300 L3248,1294 L3259,749 L3242,755 L3239,794 L3117,791 L3123,83 L3096,80 L3096,113 L1912,277 L1915,158 L1959,155 L1953,128 L1209,232 L1218,907 L1424,916 L1418,1300 L1671,1294 L1671,1124 L1876,1130 Z",
      "4A": "M138,2013 L1224,2019 L1221,1704 L1638,1716 L1638,1555 L1221,1552 L1224,1303 L1424,1300 L1421,913 L1224,904 L1215,232 L168,372 L171,396 L207,396 L204,514 L135,526 Z",
      "4B": "M3111,2325 L1418,2325 L1421,2016 L1215,2013 L1227,1701 L2075,1698 L2087,1294 L3253,1291 L3259,2290 L3230,2290 L3230,2260 L3114,2260 Z",
      "4C": "M1882,1300 L3248,1294 L3259,749 L3242,755 L3239,794 L3117,791 L3123,83 L3096,80 L3096,113 L1912,277 L1915,158 L1959,155 L1953,128 L1209,232 L1218,907 L1424,916 L1418,1300 L1671,1294 L1671,1124 L1876,1130 Z",
      "5A": "M138,2013 L1224,2019 L1221,1704 L1638,1716 L1638,1555 L1221,1552 L1224,1303 L1424,1300 L1421,913 L1224,904 L1215,232 L168,372 L171,396 L207,396 L204,514 L135,526 Z",
      "5B": "M3111,2325 L1418,2325 L1421,2016 L1215,2013 L1227,1701 L2075,1698 L2087,1294 L3253,1291 L3259,2290 L3230,2290 L3230,2260 L3114,2260 Z",
      "5C": "M1882,1300 L3248,1294 L3259,749 L3242,755 L3239,794 L3117,791 L3123,83 L3096,80 L3096,113 L1912,277 L1915,158 L1959,155 L1953,128 L1209,232 L1218,907 L1424,916 L1418,1300 L1671,1294 L1671,1124 L1876,1130 Z",
      "6A": "M138,2013 L1224,2019 L1221,1704 L1638,1716 L1638,1555 L1221,1552 L1224,1303 L1424,1300 L1421,913 L1224,904 L1215,232 L168,372 L171,396 L207,396 L204,514 L135,526 Z",
      "6B": "M3111,2325 L1418,2325 L1421,2016 L1215,2013 L1227,1701 L2075,1698 L2087,1294 L3253,1291 L3259,2290 L3230,2290 L3230,2260 L3114,2260 Z",
      "6C": "M1882,1300 L3248,1294 L3259,749 L3242,755 L3239,794 L3117,791 L3123,83 L3096,80 L3096,113 L1912,277 L1915,158 L1959,155 L1953,128 L1209,232 L1218,907 L1424,916 L1418,1300 L1671,1294 L1671,1124 L1876,1130 Z",
      "7A": "M138,2013 L1224,2019 L1221,1704 L1638,1716 L1638,1555 L1221,1552 L1224,1303 L1424,1300 L1421,913 L1224,904 L1215,232 L168,372 L171,396 L207,396 L204,514 L135,526 Z",
      "7B": "M3111,2325 L1418,2325 L1421,2016 L1215,2013 L1227,1701 L2075,1698 L2087,1294 L3253,1291 L3259,2290 L3230,2290 L3230,2260 L3114,2260 Z",
      "7C": "M1882,1300 L3248,1294 L3259,749 L3242,755 L3239,794 L3117,791 L3123,83 L3096,80 L3096,113 L1912,277 L1915,158 L1959,155 L1953,128 L1209,232 L1218,907 L1424,916 L1418,1300 L1671,1294 L1671,1124 L1876,1130 Z",

      // Floor 8
      "8A": "M854,1776 L203,1786 L208,420 L605,414 L595,351 L1341,255 L1346,1304 L1754,1304 L1754,1447 L1346,1463 L1346,1702 L859,1712 Z",
      "8B": "M1346,1447 L1341,1702 L1558,1712 L1558,1792 L1748,1792 L1748,2094 L3114,2094 L3108,1087 L2436,1087 L2431,1214 L2251,1220 L2256,1431 Z",
      "8C": "M3119,1092 L2426,1082 L2426,1008 L2045,1018 L2039,838 L2436,817 L2442,626 L1965,626 L1976,838 L1817,838 L1817,1008 L1346,1008 L1346,255 L3124,22 Z",

      // Floor 9
      "9A": "M22,342 L26,1335 L1599,1335 L1602,1054 L1449,1054 L1442,926 L1001,929 L1001,214 Z",
      "9B": "M1342,1332 L1342,1613 L2345,1610 L2352,26 L1001,217 L994,342 L1175,346 L1178,679 L1783,683 L1783,1047 L1606,1051 L1606,1325 Z",
    }

    // For floors 3-7, use the same paths as floor 2
    if (floorNumber >= 3 && floorNumber <= 7) {
      const aptIds = ["A", "B", "C"]
      aptIds.forEach((aptId) => {
        svgPaths[`${floorNumber}${aptId}`] = svgPaths[`2${aptId}`]
      })
    }

    return svgPaths
  }

  getDefaultPrice(apartmentId) {
    const prices = {
      "1A": "$774.200",
      "1B": "$820.900",
      "1C": "$667.600",
      "2A": "$610.000",
      "2B": "$668.800",
      "2C": "$468.800",
      "3A": "$631.900",
      "3B": "$692.900",
      "3C": "$469.800",
      "4A": "$657.300",
      "4B": "$717.000",
      "4C": "$424.800",
      "5A": "$679.300",
      "5B": "$741.100",
      "5C": "$439.100",
      "6A": "$696.200",
      "6B": "$759.500",
      "6C": "$450.100",
      "7A": "$696.200",
      "7B": "$759.500",
      "7C": "$450.100",
      "8A": "$696.200",
      "8B": "$759.500",
      "8C": "$450.100",
      "9A": "$696.200",
      "9B": "$759.500",
    }
    return prices[apartmentId] || "$500.000"
  }

  getDefaultSurface(apartmentId) {
    const surfaces = {
      "1A": "181,55 m²",
      "1B": "183,35 m²",
      "1C": "154,25 m²",
      "2A": "196,15 m²",
      "2B": "201,05 m²",
      "2C": "168,35 m²",
      "3A": "196,15 m²",
      "3B": "201,05 m²",
      "3C": "168,35 m²",
      "4A": "196,15 m²",
      "4B": "201,05 m²",
      "4C": "168,35 m²",
      "5A": "196,15 m²",
      "5B": "201,05 m²",
      "5C": "168,35 m²",
      "6A": "196,15 m²",
      "6B": "201,05 m²",
      "6C": "168,35 m²",
      "7A": "196,15 m²",
      "7B": "201,05 m²",
      "7C": "168,35 m²",
      "8A": "196,15 m²",
      "8B": "201,05 m²",
      "8C": "168,35 m²",
      "9A": "196,15 m²",
      "9B": "201,05 m²",
    }
    return surfaces[apartmentId] || "150,00 m²"
  }

  getDefaultStatus(apartmentId) {
    const statuses = {
      "3A": "ocupado",
      "3B": "ocupado",
      "5A": "ocupado",
      "5B": "ocupado",
      "5C": "ocupado",
      "6B": "ocupado",
      "6C": "reservado",
      "7B": "ocupado",
      "7C": "reservado",
      "8B": "ocupado",
      "8C": "reservado",
    }
    return statuses[apartmentId] || "libre"
  }

  getDefaultBuyer(apartmentId) {
    const buyers = {
      "3A": "Luciano Florentino",
      "3B": "Pedro Ramírez",
      "5A": "Carlos Hernández",
      "5B": "Javier Martínez",
      "5C": "Laura Fernández",
      "6B": "Mariano Nicolas Aldrede",
      "6C": "Isabel Rodríguez",
      "7B": "Mariano Nicolas Aldrede",
      "7C": "Isabel Rodríguez",
      "8B": "Mariano Nicolas Aldrede",
      "8C": "Isabel Rodríguez",
    }
    return buyers[apartmentId] || ""
  }

  getDefaultDate(apartmentId) {
    const dates = {
      "3A": "2023-09-27",
      "3B": "2023-09-05",
      "5A": "2024-01-23",
      "5B": "2023-11-20",
      "5C": "2024-09-04",
      "6B": "2023-07-14",
      "6C": "2023-12-25",
      "7B": "2023-07-14",
      "7C": "2023-12-25",
      "8B": "2023-07-14",
      "8C": "2023-12-25",
    }
    return dates[apartmentId] || new Date().toISOString().split("T")[0]
  }

  getActionType(status) {
    switch (status) {
      case "ocupado":
        return "sell"
      case "reservado":
        return "reserve"
      case "bloqueado":
        return "block"
      case "libre":
        return "release"
      default:
        return "update"
    }
  }
}

module.exports = new ApartmentService()
