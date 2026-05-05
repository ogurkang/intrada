import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'

const THIN_BORDER = {
  top: { style: 'thin' as const, color: { rgb: 'D1D5DB' } },
  bottom: { style: 'thin' as const, color: { rgb: 'D1D5DB' } },
  left: { style: 'thin' as const, color: { rgb: 'D1D5DB' } },
  right: { style: 'thin' as const, color: { rgb: 'D1D5DB' } },
}

function padRow(cols: number, cells: (string | number)[]): (string | number)[] {
  const r = [...cells]
  while (r.length < cols) r.push('')
  return r
}

/**
 * Rapor Yönetimi Excel standardı:
 * - 3 satır üst başlık (başlık, dönem, anlık tarih)
 * - başlık satırı + veri satırları + Toplam satırı
 * - ince border, header/total gri dolgu, sabit hizalama
 *
 * Yeni rapor Excel'leri bu helper üzerinden üretilmelidir.
 */
export function raporExcelStandartResponse(input: {
  baslik: string
  donemEtiket: string
  anlikTarihEtiket: string
  kolonlar: string[]
  satirlar: (string | number)[][]
  sheetName: string
  downloadFileName: string
  totalLabel?: string
  totalValue?: number | string
  /** Veri satırları (satirlar[i]) için dolgu rengi; null/undefined = beyaz. satirlar ile aynı uzunlukta olmalı. */
  satirDolguRgb?: (string | null | undefined)[]
}) {
  const {
    baslik,
    donemEtiket,
    anlikTarihEtiket,
    kolonlar,
    satirlar,
    sheetName,
    downloadFileName,
    totalLabel = 'Toplam',
    totalValue = satirlar.length,
    satirDolguRgb,
  } = input
  const cols = kolonlar.length
  const rows: (string | number)[][] = [
    padRow(cols, [baslik]),
    padRow(cols, [donemEtiket]),
    padRow(cols, [anlikTarihEtiket]),
    padRow(cols, ['']),
    padRow(cols, kolonlar),
    ...satirlar.map(r => padRow(cols, r)),
    padRow(cols, [totalLabel, ...Array.from({ length: Math.max(0, cols - 2) }, () => ''), totalValue]),
  ]

  const ws = XLSX.utils.aoa_to_sheet(rows)
  const headerRow = 4
  const totalRow = headerRow + 1 + satirlar.length
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: cols - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: cols - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: cols - 1 } },
    { s: { r: totalRow, c: 0 }, e: { r: totalRow, c: cols - 2 } },
  ]
  ws['!cols'] = kolonlar.map((k, i) => {
    if (i === 0) return { wch: 8 }
    if (k.toLocaleLowerCase('tr-TR').includes('sicil')) return { wch: 14 }
    if (k.toLocaleLowerCase('tr-TR').includes('adı') || k.toLocaleLowerCase('tr-TR').includes('ad soyad')) return { wch: 24 }
    if (k.toLocaleLowerCase('tr-TR').includes('adres')) return { wch: 36 }
    return { wch: 18 }
  })

  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
  for (let r = 0; r <= range.e.r; r++) {
    for (let c = 0; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c })
      if (!ws[addr]) continue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cell = ws[addr] as any
      const isTitle = r <= 2
      const isHead = r === headerRow
      const isTotal = r === totalRow
      const inData = r >= headerRow && r <= totalRow
      const isDataRow = r > headerRow && r < totalRow
      const dataRowIndex = isDataRow ? r - headerRow - 1 : -1
      cell.s = {
        font: { name: 'Calibri', sz: 11, bold: isTitle || isHead || isTotal },
        alignment: {
          vertical: 'center',
          horizontal: isTitle || c === 0 ? 'center' : 'left',
          wrapText: true,
        },
        ...(inData ? { border: THIN_BORDER } : {}),
      }
      if (isHead || isTotal) {
        cell.s.fill = { patternType: 'solid', fgColor: { rgb: isHead ? 'E5E7EB' : 'F1F5F9' } }
      } else if (isDataRow && satirDolguRgb && dataRowIndex >= 0 && dataRowIndex < satirDolguRgb.length) {
        const rgb = satirDolguRgb[dataRowIndex]
        if (rgb) cell.s.fill = { patternType: 'solid', fgColor: { rgb } }
      }
    }
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const encodedFilename = encodeURIComponent(downloadFileName)

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${downloadFileName}"; filename*=UTF-8''${encodedFilename}`,
    },
  })
}
