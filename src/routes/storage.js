// Este archivo sirve como referencia para sincronizar datos locales con el backend si es necesario en el futuro
// Por ahora, todo se almacena localmente en localStorage

export const storageRoutes = {
  // Endpoint para obtener backup de datos locales (si es necesario desde el backend)
  getProjectBackup: async (projectId) => {
    // Retorna los datos almacenados localmente convertidos a JSON
    return {
      success: true,
      message: "Backup de datos locales",
      data: {
        projectId,
        timestamp: new Date().toISOString(),
        note: "Los datos se almacenan localmente en localStorage del navegador",
      },
    }
  },

  // Endpoint para restaurar backup (si es necesario)
  restoreProjectBackup: async (projectId, backupData) => {
    return {
      success: true,
      message: "Backup restaurado correctamente",
      projectId,
    }
  },
}
