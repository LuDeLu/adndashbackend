const { generatePDF } = require("../lib/pdf-generator")
const asyncHandler = require("../utils/asyncHandler")

// Método para generar PDF
const generatePDFHandler = asyncHandler(async (req, res) => {
  try {
    const { formData } = req.body
    
    if (!formData) {
      return res.status(400).json({ message: "Datos del formulario requeridos" })
    }
    
    console.log("Generando PDF para formulario")
    const pdfBuffer = await generatePDF(formData)
    
    // Configurar encabezados para descargar el PDF
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename=formulario.pdf')
    
    // Enviar el PDF como respuesta
    res.send(pdfBuffer)
  } catch (error) {
    console.error("Error al generar PDF:", error)
    res.status(500).json({ message: "Error al generar PDF", error: error.message })
  }
})

module.exports = {
  generatePDFHandler
}
