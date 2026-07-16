/** A4 yazdırma — her kenardan 2,5 cm iç boşluk */
export const EK5_MARGIN_MM = 25
export const EK5_PRINTABLE_WIDTH_MM = 210 - EK5_MARGIN_MM * 2 // 160mm
export const EK5_PRINTABLE_HEIGHT_MM = 297 - EK5_MARGIN_MM * 2 // 247mm

const MM_TO_PX = 96 / 25.4
export const EK5_PRINTABLE_WIDTH_PX = EK5_PRINTABLE_WIDTH_MM * MM_TO_PX
export const EK5_PRINTABLE_HEIGHT_PX = EK5_PRINTABLE_HEIGHT_MM * MM_TO_PX

/** Ek-5 önizleme — tek A4, 2,5 cm kenar boşluklu yazdırma stilleri */
export const PERFORMANS_EK5_PRINT_CSS = `
@page {
  size: A4 portrait;
  margin: 2.5cm;
}
* { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  width: ${EK5_PRINTABLE_WIDTH_MM}mm;
  font-family: Arial, Helvetica, sans-serif;
  color: #111;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
body {
  display: block;
}
.ek5-print-wrap {
  width: ${EK5_PRINTABLE_WIDTH_MM}mm;
  max-width: ${EK5_PRINTABLE_WIDTH_MM}mm;
  transform-origin: top left;
}
.ek5-print-root {
  width: 100%;
  font-size: 7.5pt;
  line-height: 1.15;
}
.ek5-print-root .ek5-baslik {
  text-align: center;
  border-bottom: 1px solid #333;
  padding-bottom: 2mm;
  margin-bottom: 2.5mm;
}
.ek5-print-root .ek5-baslik p { margin: 0; }
.ek5-print-root .ek5-baslik .ana { font-size: 9.5pt; font-weight: 700; }
.ek5-print-root .ek5-bilgi {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1mm 4mm;
  font-size: 7pt;
  margin-bottom: 2mm;
}
.ek5-print-root .ek5-bilgi .tam { grid-column: 1 / -1; }
.ek5-print-root .ek5-not {
  font-size: 6.8pt;
  font-style: italic;
  margin: 0 0 2mm;
}
.ek5-print-root table {
  width: 100%;
  border-collapse: collapse;
  font-size: 6.8pt;
  table-layout: fixed;
}
.ek5-print-root th,
.ek5-print-root td {
  border: 1px solid #333;
  padding: 0.8mm 1.2mm;
  vertical-align: top;
  word-wrap: break-word;
  overflow-wrap: anywhere;
}
.ek5-print-root th {
  background: #eee;
  font-weight: 700;
  text-align: center;
  font-size: 7pt;
}
.ek5-print-root .bolum td {
  background: #f0f0f0;
  font-weight: 700;
  text-align: center;
  font-size: 7pt;
  padding: 1mm;
}
.ek5-print-root .no { width: 7mm; text-align: center; }
.ek5-print-root .puan { width: 11mm; text-align: center; font-weight: 700; vertical-align: middle; }
.ek5-print-root .kriter-baslik {
  font-weight: 700;
  font-size: 6.8pt;
  line-height: 1.15;
}
.ek5-print-root .kriter-aciklama {
  display: block;
  font-weight: 400;
  font-size: 6.2pt;
  line-height: 1.2;
  color: #333;
  margin-top: 0.5mm;
}
.ek5-print-root tfoot td {
  font-weight: 700;
  background: #f5f5f5;
  font-size: 6.8pt;
}
.ek5-print-root .puan-bant {
  font-size: 6.5pt;
  margin: 2mm 0;
  line-height: 1.25;
}
.ek5-print-root .imza-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4mm;
  margin-top: 2.5mm;
  padding-top: 2mm;
  border-top: 1px solid #333;
  font-size: 7pt;
}
.ek5-print-root .imza-grid p { margin: 0.6mm 0; }
.ek5-print-root .imza-baslik { font-weight: 700; margin-bottom: 1mm !important; }
`

/** İçeriği 160×247 mm yazdırılabilir alana sığdırmak için ölçek */
export function performansEk5PrintScale(widthPx: number, heightPx: number): number {
  const scaleW = widthPx > EK5_PRINTABLE_WIDTH_PX ? EK5_PRINTABLE_WIDTH_PX / widthPx : 1
  const scaleH = heightPx > EK5_PRINTABLE_HEIGHT_PX ? EK5_PRINTABLE_HEIGHT_PX / heightPx : 1
  const scale = Math.min(scaleW, scaleH)
  return Math.max(scale, 0.68)
}

export function performansEk5Yazdir(root: HTMLElement): void {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:none'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument
  const win = iframe.contentWindow
  if (!doc || !win) {
    iframe.remove()
    return
  }

  const clone = root.cloneNode(true) as HTMLElement
  clone.querySelectorAll('.print-hide').forEach(el => el.remove())
  clone.classList.add('ek5-print-root')

  doc.open()
  doc.write(
    `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><style>${PERFORMANS_EK5_PRINT_CSS}</style></head><body></body></html>`,
  )
  doc.close()

  const wrap = doc.createElement('div')
  wrap.className = 'ek5-print-wrap'
  wrap.appendChild(clone)
  doc.body.appendChild(wrap)

  const fit = () => {
    const w = wrap.scrollWidth
    const h = wrap.scrollHeight
    const scale = performansEk5PrintScale(w, h)
    if (scale < 1) {
      wrap.style.transform = `scale(${scale})`
      wrap.style.width = `${EK5_PRINTABLE_WIDTH_MM / scale}mm`
    }
  }

  requestAnimationFrame(() => {
    fit()
    win.focus()
    win.print()
    setTimeout(() => iframe.remove(), 500)
  })
}
