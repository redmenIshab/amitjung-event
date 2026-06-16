/**
 * Captures a rendered DigitalTicket DOM element and returns a raw base64 PDF string.
 * Client-side only — uses html2canvas + jsPDF via dynamic import.
 */
export async function captureTicketPdf(el: HTMLElement): Promise<string> {
  const html2canvas = (await import('html2canvas')).default

  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: null,
    logging: false,
    // Tailwind v4 uses oklch/lab colors in its global stylesheet; html2canvas
    // can't parse them. Strip all external styles — DigitalTicket is inline-only.
    onclone: (clonedDoc) => {
      clonedDoc
        .querySelectorAll('style, link[rel="stylesheet"]')
        .forEach((s) => s.remove())
    },
  })

  const { jsPDF } = await import('jspdf')
  const imgData = canvas.toDataURL('image/jpeg', 0.92)
  const pxW = canvas.width
  const pxH = canvas.height
  const mmW = (pxW / 2) * 0.2646   // canvas is 2× scale, convert px → mm at 96 dpi
  const mmH = (pxH / 2) * 0.2646

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [mmW, mmH] })
  pdf.addImage(imgData, 'JPEG', 0, 0, mmW, mmH)
  return pdf.output('datauristring').split(',')[1]  // raw base64, no data-URI prefix
}
