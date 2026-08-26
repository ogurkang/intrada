import type ExcelJS from 'exceljs'

export type IstatistikExcelEgitim = {
  id: number
  egitim_adi: string
  egitim_baslangic: string | null
}

export type IstatistikExcelPersonel = {
  sicil_no: string
  ad_soyad: string | null
  mudurluk: string | null
}

const AYLAR = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
] as const

const TAKVIMDE_YOK = 'Takvimde yok'

const INCE: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FF94A3B8' } }
const KENAR: Partial<ExcelJS.Borders> = {
  top: INCE,
  bottom: INCE,
  left: INCE,
  right: INCE,
}

function ayBilgi(tarih: string | null): { key: string; label: string; sira: number } {
  if (!tarih) return { key: 'takvimde-yok', label: TAKVIMDE_YOK, sira: 99_999 }
  const d = new Date(tarih)
  if (Number.isNaN(d.getTime())) return { key: 'takvimde-yok', label: TAKVIMDE_YOK, sira: 99_999 }
  const ay = d.getMonth()
  return {
    key: `${d.getFullYear()}-${ay}`,
    label: AYLAR[ay],
    sira: d.getFullYear() * 12 + ay,
  }
}

function siraliEgitimler(egitimler: IstatistikExcelEgitim[]) {
  return [...egitimler].sort((a, b) => {
    const aa = ayBilgi(a.egitim_baslangic)
    const bb = ayBilgi(b.egitim_baslangic)
    if (aa.sira !== bb.sira) return aa.sira - bb.sira
    const ta = a.egitim_baslangic ?? ''
    const tb = b.egitim_baslangic ?? ''
    if (ta !== tb) return ta.localeCompare(tb)
    return a.egitim_adi.localeCompare(b.egitim_adi, 'tr')
  })
}

function dosyaAdiGuvenli(s: string) {
  return s.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
}

export async function egitimIstatistikExcelIndir(opts: {
  donemAdi: string
  kapsam: string
  egitimler: IstatistikExcelEgitim[]
  personeller: IstatistikExcelPersonel[]
  katilim: Set<string>
}) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Eğitim İstatistiği', {
    views: [{ state: 'frozen', xSplit: 4, ySplit: 5, showGridLines: false }],
  })

  const egitimler = siraliEgitimler(opts.egitimler)
  const sabitKolon = 4
  const kolonSayisi = Math.max(sabitKolon + egitimler.length, sabitKolon)

  ws.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
    horizontalCentered: true,
  }

  const baslikStil: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 13, name: 'Calibri' },
    alignment: { horizontal: 'center', vertical: 'middle' },
  }

  ws.mergeCells(1, 1, 1, kolonSayisi)
  ws.getCell(1, 1).value = `${opts.donemAdi} — Eğitim İstatistiği`
  ws.getCell(1, 1).style = baslikStil
  ws.getRow(1).height = 22

  ws.mergeCells(2, 1, 2, kolonSayisi)
  ws.getCell(2, 1).value = opts.kapsam
  ws.getCell(2, 1).style = {
    font: { size: 11, name: 'Calibri' },
    alignment: { horizontal: 'center', vertical: 'middle' },
  }

  ws.mergeCells(3, 1, 3, kolonSayisi)
  ws.getCell(3, 1).value =
    'Eğitim adları eğitim takviminden alınır. Tarih tanımlı eğitimler ilgili ayda, tarihi olmayanlar “Takvimde yok” altında gösterilir.'
  ws.getCell(3, 1).style = {
    font: { size: 9, italic: true, color: { argb: 'FF64748B' }, name: 'Calibri' },
    alignment: { horizontal: 'left', vertical: 'middle', wrapText: true },
  }
  ws.getRow(3).height = 28

  const aySatir = 4
  const adSatir = 5
  const sabitBasliklar = ['Sıra No', 'Sicil', 'Ad Soyad', 'Müdürlük']
  sabitBasliklar.forEach((ad, i) => {
    ws.mergeCells(aySatir, i + 1, adSatir, i + 1)
    const hucre = ws.getCell(aySatir, i + 1)
    hucre.value = ad
    hucre.style = {
      font: { bold: true, size: 10, name: 'Calibri' },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } },
      border: KENAR,
    }
    ws.getCell(adSatir, i + 1).style = { ...hucre.style }
  })

  const gruplar: { key: string; label: string; start: number; end: number }[] = []
  egitimler.forEach((e, i) => {
    const bilgi = ayBilgi(e.egitim_baslangic)
    const col = sabitKolon + i + 1
    const son = gruplar[gruplar.length - 1]
    if (son && son.key === bilgi.key) {
      son.end = col
    } else {
      gruplar.push({ key: bilgi.key, label: bilgi.label, start: col, end: col })
    }

    const adHucre = ws.getCell(adSatir, col)
    adHucre.value = e.egitim_adi
    adHucre.style = {
      font: { bold: true, size: 9, name: 'Calibri' },
      alignment: {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
        textRotation: 90,
      },
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bilgi.label === TAKVIMDE_YOK ? 'FFFEF3C7' : 'FFEEF2FF' },
      },
      border: KENAR,
    }
  })

  for (const g of gruplar) {
    if (g.start !== g.end) ws.mergeCells(aySatir, g.start, aySatir, g.end)
    for (let c = g.start; c <= g.end; c++) {
      const hucre = ws.getCell(aySatir, c)
      hucre.value = g.label
      hucre.style = {
        font: { bold: true, size: 10, name: 'Calibri', color: { argb: g.label === TAKVIMDE_YOK ? 'FF92400E' : 'FF3730A3' } },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: g.label === TAKVIMDE_YOK ? 'FFFDE68A' : 'FFE0E7FF' },
        },
        border: KENAR,
      }
    }
  }

  ws.getRow(aySatir).height = 22
  ws.getRow(adSatir).height = 150

  opts.personeller.forEach((p, idx) => {
    const r = adSatir + 1 + idx
    const satir = ws.getRow(r)
    const degerler = [idx + 1, p.sicil_no, p.ad_soyad ?? p.sicil_no, p.mudurluk ?? 'Belirtilmemiş']
    degerler.forEach((v, i) => {
      const hucre = satir.getCell(i + 1)
      hucre.value = v
      hucre.style = {
        font: { size: 9, name: 'Calibri' },
        alignment: {
          vertical: 'middle',
          horizontal: i === 0 || i === 1 ? 'center' : 'left',
        },
        border: KENAR,
      }
    })
    egitimler.forEach((e, i) => {
      const katildi = opts.katilim.has(`${p.sicil_no}:${e.id}`)
      const hucre = satir.getCell(sabitKolon + i + 1)
      hucre.value = katildi ? 'Evet' : ''
      hucre.style = {
        font: { size: 9, name: 'Calibri', color: { argb: katildi ? 'FF047857' : 'FF94A3B8' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: katildi
          ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }
          : undefined,
        border: KENAR,
      }
    })
    satir.height = 18
  })

  ws.getColumn(1).width = 10
  ws.getColumn(2).width = 12
  ws.getColumn(3).width = 28
  ws.getColumn(4).width = 28
  for (let i = 0; i < egitimler.length; i++) {
    ws.getColumn(sabitKolon + i + 1).width = 6
  }

  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const kapsamParca = dosyaAdiGuvenli(opts.kapsam) || 'Tumu'
  a.download = `Egitim_Istatistik_${dosyaAdiGuvenli(opts.donemAdi)}_${kapsamParca}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
