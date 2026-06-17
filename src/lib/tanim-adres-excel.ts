import * as XLSX from 'xlsx'
import { trNormalize } from '@/lib/turkce-search'
import { adresMahalleAnahtari, ilAdiBul, ilceAdiBul } from '@/lib/turkiye-adres'

export type AdresExcelSatir = {
  excelSatir: number
  il: string
  ilce: string
  mahalle_adi: string
}

function cellToText(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'number') return String(v)
  return String(v).trim()
}

function baslikSatiriMi(cells: unknown[]): boolean {
  const parts = cells.slice(0, 3).map(c => trNormalize(cellToText(c)))
  if (!parts.some(Boolean)) return false
  const birlesik = parts.join(' ')
  return (
    birlesik.includes('il') &&
    (birlesik.includes('ilce') || birlesik.includes('ilçe')) &&
    (birlesik.includes('mahalle') || birlesik.includes('mhalle'))
  )
}

export function adresMahalleExcelSatirlariOku(buffer: ArrayBuffer): {
  satirlar: AdresExcelSatir[]
  hatalar: string[]
} {
  const wb = XLSX.read(buffer, { type: 'array' })
  const first = wb.SheetNames[0]
  if (!first) return { satirlar: [], hatalar: ['Excel dosyasında sayfa bulunamadı.'] }

  const ws = wb.Sheets[first]
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(ws, {
    header: 1,
    raw: true,
    defval: null,
  })

  const hatalar: string[] = []
  const satirlar: AdresExcelSatir[] = []
  const dosyaIcinde = new Set<string>()
  let baslikAtlandi = false

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] ?? []
    const excelSatir = i + 1
    const ilRaw = cellToText(r[0])
    const ilceRaw = cellToText(r[1])
    const mahalleRaw = cellToText(r[2])

    if (!baslikAtlandi && baslikSatiriMi(r)) {
      baslikAtlandi = true
      continue
    }
    if (!ilRaw && !ilceRaw && !mahalleRaw) continue

    if (!ilRaw) {
      hatalar.push(`Satır ${excelSatir}: İl boş.`)
      continue
    }
    if (!ilceRaw) {
      hatalar.push(`Satır ${excelSatir}: İlçe boş.`)
      continue
    }
    if (!mahalleRaw) {
      hatalar.push(`Satır ${excelSatir}: Mahalle boş.`)
      continue
    }

    const il = ilAdiBul(ilRaw)
    if (!il) {
      hatalar.push(`Satır ${excelSatir}: Geçersiz il («${ilRaw}»).`)
      continue
    }
    const ilce = ilceAdiBul(il, ilceRaw)
    if (!ilce) {
      hatalar.push(`Satır ${excelSatir}: «${il}» için geçersiz ilçe («${ilceRaw}»).`)
      continue
    }

    const anahtar = adresMahalleAnahtari(il, ilce, mahalleRaw)
    if (dosyaIcinde.has(anahtar)) {
      hatalar.push(`Satır ${excelSatir}: Dosyada mükerrer kayıt (${mahalleRaw}, ${ilce}/${il}).`)
      continue
    }
    dosyaIcinde.add(anahtar)

    satirlar.push({ excelSatir, il, ilce, mahalle_adi: mahalleRaw })
  }

  if (!satirlar.length && !hatalar.length) {
    hatalar.push('Geçerli veri satırı bulunamadı. İl, İlçe ve Mahalle sütunlarını kontrol edin.')
  }

  return { satirlar, hatalar }
}

export function adresMahalleSablonBuffer(): Buffer {
  const rows = [
    ['İl', 'İlçe', 'Mahalle'],
    ['Sakarya', 'Adapazarı', 'Örnek Mahalle'],
    ['Sakarya', 'Serdivan', 'İkinci Mahalle Örneği'],
  ]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 18 }, { wch: 18 }, { wch: 28 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Adres')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}
