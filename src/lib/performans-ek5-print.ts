/** Ek-5 önizleme — tek A4 sayfasına sığdırılmış yazdırma stilleri */
export const PERFORMANS_EK5_PRINT_CSS = `
@page {
  size: A4 portrait;
  margin: 6mm;
}
* { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  font-family: Arial, Helvetica, sans-serif;
  color: #111;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
body {
  display: flex;
  justify-content: center;
  align-items: flex-start;
}
.ek5-print-wrap {
  width: 100%;
  max-width: 198mm;
  transform-origin: top center;
}
.ek5-print-root {
  font-size: 7pt;
  line-height: 1.12;
}
.ek5-print-root .ek5-baslik {
  text-align: center;
  border-bottom: 1px solid #ccc;
  padding-bottom: 3mm;
  margin-bottom: 2mm;
}
.ek5-print-root .ek5-baslik p { margin: 0.5mm 0; }
.ek5-print-root .ek5-baslik .ana { font-size: 8.5pt; font-weight: 700; }
.ek5-print-root .ek5-baslik .alt { font-size: 7pt; font-weight: 600; }
.ek5-print-root .ek5-bilgi {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.8mm 3mm;
  font-size: 6.8pt;
  margin-bottom: 2mm;
}
.ek5-print-root .ek5-bilgi .tam { grid-column: 1 / -1; }
.ek5-print-root .ek5-not { font-size: 6.5pt; font-style: italic; margin: 0 0 1.5mm; }
.ek5-print-root table {
  width: 100%;
  border-collapse: collapse;
  font-size: 6.2pt;
  table-layout: fixed;
}
.ek5-print-root th,
.ek5-print-root td {
  border: 1px solid #999;
  padding: 0.6mm 1mm;
  vertical-align: top;
  word-wrap: break-word;
}
.ek5-print-root th {
  background: #eee;
  font-weight: 700;
  text-align: center;
}
.ek5-print-root .bolum td {
  background: #f5f5f5;
  font-weight: 700;
  text-align: center;
  font-size: 6.5pt;
}
.ek5-print-root .no { width: 6mm; text-align: center; }
.ek5-print-root .puan { width: 10mm; text-align: center; font-weight: 700; }
.ek5-print-root .kriter-baslik { font-weight: 600; }
.ek5-print-root .kriter-aciklama { display: none; }
.ek5-print-root tfoot td { font-weight: 700; background: #f9f9f9; }
.ek5-print-root .puan-bant {
  font-size: 6pt;
  margin: 1.5mm 0;
  line-height: 1.2;
}
.ek5-print-root .imza-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3mm;
  margin-top: 2mm;
  padding-top: 2mm;
  border-top: 1px solid #ccc;
  font-size: 6.8pt;
}
.ek5-print-root .imza-grid p { margin: 0.8mm 0; }
.ek5-print-root .imza-baslik { font-weight: 700; margin-bottom: 1mm !important; }
`

/** İçerik yüksekliğine göre A4 yazdırılabilir alana scale hesaplar (~275mm) */
export function performansEk5PrintScale(contentHeightPx: number): number {
  const printablePx = 1015
  if (contentHeightPx <= printablePx) return 1
  return Math.max(0.72, printablePx / contentHeightPx)
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
  clone.querySelectorAll('.print-hide, .kriter-aciklama').forEach(el => el.remove())
  clone.classList.add('ek5-print-root')

  doc.open()
  doc.write(`<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><style>${PERFORMANS_EK5_PRINT_CSS}</style></head><body></body></html>`)
  doc.close()

  const wrap = doc.createElement('div')
  wrap.className = 'ek5-print-wrap'
  wrap.appendChild(clone)
  doc.body.appendChild(wrap)

  const fit = () => {
    const h = wrap.scrollHeight
    const scale = performansEk5PrintScale(h)
    wrap.style.transform = scale < 1 ? `scale(${scale})` : ''
    if (scale < 1) {
      wrap.style.width = `${100 / scale}%`
    }
  }

  requestAnimationFrame(() => {
    fit()
    win.focus()
    win.print()
    setTimeout(() => iframe.remove(), 500)
  })
}
