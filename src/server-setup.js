const fs = require('fs');
const path = require('path');

function ensureUploadsDirectory() {
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  fs.chmodSync(uploadsDir, '755');
  return uploadsDir;
}

function setupApplication() {
  const uploadsDir = ensureUploadsDirectory();
  console.log(`Directorio de uploads creado/verificado en: ${uploadsDir}`);
  return {
    uploadsDir
  };
}

module.exports = {
  setupApplication,
  ensureUploadsDirectory
};
