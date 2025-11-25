const { PDFDocument, rgb, StandardFonts } = require("pdf-lib")
const fs = require("fs")
const path = require("path")

/**
 * Genera un PDF basado en los datos del formulario
 * @param {Object} formData - Datos del formulario
 * @returns {Promise<Buffer>} - Buffer con el PDF generado
 */
async function generatePDF(formData) {
  try {
    // Cargar el PDF existente desde el sistema de archivos
    const pdfPath = path.join(__dirname, "../public/check.pdf")
    const existingPdfBytes = fs.readFileSync(pdfPath)

    // Cargar el documento PDF existente
    const pdfDoc = await PDFDocument.load(existingPdfBytes)

    // Obtener las páginas
    const pages = pdfDoc.getPages()
    const firstPage = pages[0]
    const secondPage = pages.length > 1 ? pages[1] : null

    // Configurar fuente
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    // Definir color de texto (negro)
    const textColor = rgb(0, 0, 0)

    // Función helper para agregar texto en la primera página
    const addText = (text, x, y, size = 10, font = helveticaFont) => {
      firstPage.drawText(text || "", {
        x,
        y,
        size,
        font,
        color: textColor,
      })
    }

    // Función helper para agregar texto en la segunda página
    const addTextPage2 = (text, x, y, size = 10, font = helveticaFont) => {
      if (secondPage) {
        secondPage.drawText(text || "", {
          x,
          y,
          size,
          font,
          color: textColor,
        })
      }
    }

    // Fecha de Firma
    addText(formData.fechaFirma || "", 102, 713, 10)

    // Sección 1-3
    addText(formData.emprendimiento || "", 145, 692.5, 10)
    addText(formData.quienVende || "", 128, 677.5, 10)
    addText(formData.unidadFuncional || "", 146, 663.5, 10)

    // Sección 4 - M2
    if (formData.m2) {
      addText(formData.m2.totales || "", 203.5, 650, 10)
      addText(formData.m2.cubierta || "", 165.5, 635, 10)
      addText(formData.m2.semiCubierta || "", 186.5, 621, 10)
      addText(formData.m2.palierPrivado || "", 166, 607.8, 10)
      addText(formData.m2.amenities || "", 171, 593.5, 10)
    }

    // Sección 5 - Tipo de Documento
    // Marcar con X según el tipo de documento seleccionado
    const tipoDocY = {
      reserva: 545, 
      boleto: 530,
      cesion: 516,
      mutuo: 505,
      locacion: 484,
      otros: 466,
    }

    if (formData.tipoDocumento && tipoDocY[formData.tipoDocumento]) {
      addText("X", 333, tipoDocY[formData.tipoDocumento], 10, helveticaBold)
    }

    // Sección 6 - Precio y Formas de Pago
    if (formData.precio) {
      addText(formData.precio.valorVentaTotal || "", 226.5, 418, 10)
      addText(formData.precio.valorUF || "", 175.5, 402.5, 10)
      addText(formData.precio.valorCHBaulera || "", 201.5, 388, 10)
      addText(formData.precio.valorVentaA || "", 220, 361.5, 10)
      addText(formData.precio.valorM2 || "", 180, 334, 10)
      addText(formData.precio.valorM2Neto || "", 210, 321.5, 10)

      // Forma de pago - puede requerir múltiples líneas
      let formaPagoY = 260

      // Si hay información de forma de pago, la procesamos
      if (formData.precio.formaPago) {
        const formaPagoText = formData.precio.formaPago

        // Extraer información específica usando expresiones regulares o dividir por líneas
        const senaMatch = formaPagoText.match(/Seña\s*\/\s*Reserva\s*:\s*(.*?)(?:\n|$)/i)
        const boletoMatch = formaPagoText.match(/Boleto\s*:\s*A\s*LA\s*FIRMA\s*"A"\s*:\s*(.*?)(?:\n|$)/i)
        const saldoMatch = formaPagoText.match(/Saldo\s*"A"\s*:\s*(.*?)(?:\n|$)/i)

        // Agregar cada línea específica
        if (senaMatch && senaMatch[1]) {
          addText(senaMatch[1], 200, formaPagoY, 10)
          formaPagoY -= 20
        }

        if (boletoMatch && boletoMatch[1]) {
          addText(boletoMatch[1], 200, formaPagoY, 10)
          formaPagoY -= 20
        }

        if (saldoMatch && saldoMatch[1]) {
          addText(saldoMatch[1], 200, formaPagoY, 10)
        }
      }
    }

    // Sección 7 - Datos del Comprador
    if (formData.comprador) {
      addText(formData.comprador.nombre || "", 150, 229, 10)
      addText(formData.comprador.dni || "", 90, 216, 10)
      addText(formData.comprador.direccion || "", 113, 203, 10)
      addText(formData.comprador.cuit || "", 94, 190.7, 10)
      addText(formData.comprador.mail || "", 94, 177, 10)
      addText(formData.comprador.telefono || "", 110, 163.5, 10)
    }

    // Sección 8 - Sellos
    if (formData.sellos) {
      addText(formData.sellos.montoTotal || "", 161, 124, 10)
      addText(formData.sellos.quienAbona || "", 173.5, 111, 10)
    }

    // Sección 9 - Honorarios (en la segunda página)
    if (formData.honorarios) {
      if (secondPage) {
        addTextPage2(formData.honorarios.montoTotal || "", 160, 699.8, 10)
        addTextPage2(formData.honorarios.quienAbona || "", 173, 685.7, 10)
      } else {
        // Si no hay segunda página, lo agregamos al final de la primera
        addText(formData.honorarios.montoTotal || "", 200, 30, 10)
        addText(formData.honorarios.quienAbona || "", 200, 10, 10)
      }
    }

    // Guardar el documento modificado
    const pdfBytes = await pdfDoc.save()

    // Devolver como Buffer para Node.js
    return Buffer.from(pdfBytes)
  } catch (error) {
    console.error("Error en generatePDF:", error)
    throw error
  }
}

module.exports = {
  generatePDF
}
