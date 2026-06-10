import * as XLSX from 'xlsx-js-style'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { periyotSonGunu, type RaporPeriyot } from '@/lib/rapor-statuye-gore-cinsiyet'
import { parseMudurlukParam, type StatuIzinTip } from '@/lib/rapor-statu-izinleri'
import { yukleStatuIzinRaporVerisi } from '@/lib/rapor-statu-izinleri-load'

const MIN_YIL = 2000
const MAX_YIL = 2035

export function parseStatuIzinYil(v: string | null): number {
  const parsed = Number.parseInt(v ?? '', 10)
  if (!Number.isFinite(parsed)) return new Date().getFullYear()
  return Math.min(MAX_YIL, Math.max(MIN_YIL, parsed))
}

export function parseStatuIzinPeriyot(v: string | null): RaporPeriyot {
  if (v === 'yillik') return 'yillik'
  const n = Number.parseInt(v ?? '', 10)
  if (Number.isFinite(n) && n >= 1 && n <= 12) return n as RaporPeriyot
  return 'yillik'
}

function sonGunuMetin(D: string): string {
  const [y, m, d] = D.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export async function statuIzinExcelOlustur(
  supabase: SupabaseClient<Database>,
  input: {
    statuTip: StatuIzinTip
    baslik: string
    sheetAdi: string
    dosyaAdi: string
    yil: number
    periyot: RaporPeriyot
    mudurlukFiltre?: string[]
  },
): Promise<{ buf: Buffer; filename: string }> {
  const { statuTip, baslik, sheetAdi, dosyaAdi, yil, periyot, mudurlukFiltre } = input
  const D = periyotSonGunu(yil, periyot)

  const { tabs } = await yukleStatuIzinRaporVerisi(supabase, { statuTip, yil })
  const tab = tabs.find(t => t.periyot === periyot) ?? tabs[0]
  let exportSatirlar = tab?.satirlar ?? []
  if (mudurlukFiltre && mudurlukFiltre.length > 0) {
    const set = new Set(mudurlukFiltre)
    exportSatirlar = exportSatirlar.filter(r => set.has(r.mudurluk))
  }

  const mudurlukNot =
    mudurlukFiltre && mudurlukFiltre.length > 0 ? ` · Müdürlük: ${mudurlukFiltre.join(', ')}` : ''

  const rows: (string | number)[][] = [
    [baslik],
    [`Yıl: ${yil} · Dönem sonu: ${sonGunuMetin(D)}${mudurlukNot}`],
    [''],
    ['Sıra No', 'Sicil No', 'Adı Soyadı', 'Müdürlük', 'Devreden İzin', 'Hak Edilen İzin', 'Kullanılan İzin', 'Kalan İzin'],
    ...exportSatirlar.map((r, i) => [
      i + 1,
      r.sicil_no,
      r.ad_soyad,
      r.mudurluk,
      r.devreden_izin,
      r.hak_edilen_izin,
      r.kullanilan_izin,
      r.kalan_izin,
    ]),
  ]

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
  ]
  ws['!cols'] = [
    { wch: 10 },
    { wch: 12 },
    { wch: 28 },
    { wch: 32 },
    { wch: 14 },
    { wch: 15 },
    { wch: 14 },
    { wch: 12 },
  ]

  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
  for (let r = 0; r <= range.e.r; r++) {
    for (let c = 0; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c })
      if (!ws[addr]) continue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cell = ws[addr] as any
      const isTitle = r <= 1
      const isHead = r === 3
      cell.s = {
        font: { name: 'Calibri', sz: 11, bold: isTitle || isHead },
        alignment: { vertical: 'center', horizontal: c === 0 || c >= 4 ? 'center' : 'left', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: 'D1D5DB' } },
          bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
          left: { style: 'thin', color: { rgb: 'D1D5DB' } },
          right: { style: 'thin', color: { rgb: 'D1D5DB' } },
        },
      }
      if (isHead) cell.s.fill = { patternType: 'solid', fgColor: { rgb: 'E5E7EB' } }
    }
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetAdi)
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  const filename = `${dosyaAdi}_${yil}_${periyot === 'yillik' ? 'YILLIK' : `AY-${periyot}`}.xlsx`
  return { buf, filename }
}

export function parseMudurlukFromQuery(m: string | null): string[] {
  return parseMudurlukParam(m ?? undefined)
}
