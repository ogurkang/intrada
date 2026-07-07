/**
 * Kesintiler Excel export ortak yardımcıları
 * AYY, İZY, İVY, RMY için grid kenarlığı ve yapı
 */
import * as XLSX from 'xlsx-js-style'

const GRID_BORDER = {
  top: { style: 'thin' as const },
  bottom: { style: 'thin' as const },
  left: { style: 'thin' as const },
  right: { style: 'thin' as const },
}

const ACIK_GRI = {
  fill: { fgColor: { rgb: 'E0E0E0' } },
  alignment: { horizontal: 'center' as const, vertical: 'center' as const, wrapText: true },
}

/** Worksheet'teki tüm hücrelere grid kenarlığı uygula. Eksik hücreler oluşturulur (sağ alt köşe kenarlığı için). */
export function applyGridBorders(ws: XLSX.WorkSheet, rowCount?: number, colCount?: number): void {
  const ref = ws['!ref']
  if (!ref && (rowCount == null || colCount == null)) return
  const range = ref ? XLSX.utils.decode_range(ref) : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }
  const maxR = rowCount != null ? rowCount - 1 : range.e.r
  const maxC = colCount != null ? colCount - 1 : range.e.c
  for (let R = 0; R <= maxR; R++) {
    for (let C = 0; C <= maxC; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C })
      let cell = ws[addr]
      if (!cell) {
        ws[addr] = cell = { v: '', t: 's', s: {} }
      }
      if (!cell.s) cell.s = {}
      cell.s.border = GRID_BORDER
    }
  }
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxR, c: maxC } })
}

const BOS_HUCRE_STIL = { ...ACIK_GRI, border: GRID_BORDER }

/** Dolgu yok (no fill) - sadece ortalanmış metin */
const DOLGU_YOK_STIL = {
  alignment: { horizontal: 'center' as const, vertical: 'center' as const, wrapText: true },
}

/** Merge edilmiş başlık satırı oluştur */
export function mergeSatir(text: string, colCount: number, opts?: { gri?: boolean; bold?: boolean; dolguYok?: boolean }): (string | XLSX.CellObject)[] {
  const baseStil = opts?.gri ? BOS_HUCRE_STIL : DOLGU_YOK_STIL
  const stil = opts?.bold ? { ...baseStil, font: { bold: true } } : baseStil
  const ilk = { v: text, t: 's' as const, s: stil }
  const diger = Array(colCount - 1).fill(null).map(() => ({ v: '', t: 's' as const, s: stil }))
  return [ilk, ...diger]
}

export type ImzaRol = { etiket: string; ad: string }

/** Seçili imza rolleri için sütun başlangıç indeksleri (eşit bölünür). */
function imzaSutunBaslangiclari(colCount: number, rolSayisi: number): number[] {
  if (rolSayisi <= 0) return []
  const baslangiclar: number[] = [0]
  let pos = 0
  for (let i = 0; i < rolSayisi; i++) {
    const genislik = i === rolSayisi - 1 ? colCount - pos : Math.floor(colCount / rolSayisi)
    if (i > 0) baslangiclar.push(pos)
    pos += genislik
  }
  return baslangiclar
}

/** Seçili roller için imza satırı (etiket veya ad). */
export function imzaSatiriSecili(
  colCount: number,
  roller: ImzaRol[],
  mod: 'etiket' | 'ad',
  bold = false,
): (string | XLSX.CellObject)[] {
  const stil = { ...DOLGU_YOK_STIL, ...(bold ? { font: { bold: true } } : {}) }
  const baslangiclar = imzaSutunBaslangiclari(colCount, roller.length)
  const row: (string | XLSX.CellObject)[] = []
  for (let i = 0; i < colCount; i++) {
    const rolIdx = baslangiclar.findIndex((start, idx) => {
      const sonraki = idx < baslangiclar.length - 1 ? baslangiclar[idx + 1] : colCount
      return i >= start && i < sonraki
    })
    const metin = rolIdx >= 0 && i === baslangiclar[rolIdx]
      ? (mod === 'etiket' ? roller[rolIdx].etiket : roller[rolIdx].ad)
      : ''
    row.push({ v: metin, t: 's' as const, s: stil })
  }
  return row
}

/** Seçili roller için imza merge aralıkları */
export function imzaMergelerSecili(rowIdx: number, colCount: number, rolSayisi: number): XLSX.Range[] {
  const baslangiclar = imzaSutunBaslangiclari(colCount, rolSayisi)
  return baslangiclar.map((start, idx) => {
    const bitis = idx < baslangiclar.length - 1 ? baslangiclar[idx + 1] - 1 : colCount - 1
    return { s: { r: rowIdx, c: start }, e: { r: rowIdx, c: bitis } }
  })
}

/** İmza satırı: 3 eşit sütunda PUANTÖR | BİRİM AMİRİ | MÜDÜR */
export function imzaSatiri(colCount: number, labels: [string, string, string], bold = false): (string | XLSX.CellObject)[] {
  const c1 = Math.floor(colCount / 3)
  const c2 = Math.floor((2 * colCount) / 3)
  const stil = { ...DOLGU_YOK_STIL, ...(bold ? { font: { bold: true } } : {}) }
  const row: (string | XLSX.CellObject)[] = []
  for (let i = 0; i < colCount; i++) {
    if (i === 0) row.push({ v: labels[0], t: 's' as const, s: stil })
    else if (i === c1) row.push({ v: labels[1], t: 's' as const, s: stil })
    else if (i === c2) row.push({ v: labels[2], t: 's' as const, s: stil })
    else row.push({ v: '', t: 's' as const, s: stil })
  }
  return row
}

/** 3 sütunlu imza merge aralıkları */
export function imzaMergeler(rowIdx: number, colCount: number): XLSX.Range[] {
  const c1 = Math.floor(colCount / 3)
  const c2 = Math.floor((2 * colCount) / 3)
  return [
    { s: { r: rowIdx, c: 0 }, e: { r: rowIdx, c: c1 - 1 } },
    { s: { r: rowIdx, c: c1 }, e: { r: rowIdx, c: c2 - 1 } },
    { s: { r: rowIdx, c: c2 }, e: { r: rowIdx, c: colCount - 1 } },
  ]
}

/** Belirli satır aralığına grid kenarlığı uygula (merge edilmiş hücrelerin alt/sağ kenarları için) */
export function applyGridBordersRange(ws: XLSX.WorkSheet, startR: number, endR: number, colCount: number): void {
  for (let R = startR; R <= endR; R++) {
    for (let C = 0; C < colCount; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C })
      let cell = ws[addr]
      if (!cell) {
        ws[addr] = cell = { v: '', t: 's', s: {} }
      }
      if (!cell.s) cell.s = {}
      cell.s.border = GRID_BORDER
    }
  }
}

/** Sadece belirtilen satırlara kenarlık uygula */
export function applyBordersToRows(ws: XLSX.WorkSheet, rowIndices: Set<number>, colCount: number, maxR: number): void {
  for (let R = 0; R <= maxR; R++) {
    for (let C = 0; C < colCount; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C })
      let cell = ws[addr]
      if (!cell) {
        ws[addr] = cell = { v: '', t: 's', s: {} }
      }
      if (!cell.s) cell.s = {}
      if (rowIndices.has(R)) {
        cell.s.border = GRID_BORDER
      } else {
        cell.s.border = undefined
      }
    }
  }
}
