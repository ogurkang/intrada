import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { filterOutHiddenSystemByEmail } from '@/lib/godmode-calisan'
import {
  adabelPersonelBilgileriListeSnapshot,
} from '@/lib/rapor-adabel-personel-bilgileri-liste'
import {
  periyotSonGunu,
  type RaporPeriyot,
} from '@/lib/rapor-statuye-gore-cinsiyet'
import { createClient } from '@/lib/supabase/server'

const AYLAR_TR = ['Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran', 'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik']
const MIN_YIL = 2000
const MAX_YIL = 2035

function parseYil(v: string | null): number {
  const parsed = Number.parseInt(v ?? '', 10)
  if (!Number.isFinite(parsed)) return new Date().getFullYear()
  return Math.min(MAX_YIL, Math.max(MIN_YIL, parsed))
}

function parsePeriyot(v: string | null): RaporPeriyot {
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

function padRow(cols: number, cells: (string | number)[]): (string | number)[] {
  const r = [...cells]
  while (r.length < cols) r.push('')
  return r
}

const THIN_BORDER = {
  top: { style: 'thin' as const, color: { rgb: 'D1D5DB' } },
  bottom: { style: 'thin' as const, color: { rgb: 'D1D5DB' } },
  left: { style: 'thin' as const, color: { rgb: 'D1D5DB' } },
  right: { style: 'thin' as const, color: { rgb: 'D1D5DB' } },
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const yil = parseYil(searchParams.get('y'))
    const periyot = parsePeriyot(searchParams.get('p'))

    const { data: kayitlarRaw } = await supabase
      .from('firma_calisanlar')
      .select(
        'sicil_no, ad_soyad, tckn, cinsiyet, dogum_tarihi, ogrenim, telefon, e_posta, kuruma_giris_tarihi, gorev_mudurlugu, gorevi, ayrilis_tarihi',
      )

    const kayitlar = filterOutHiddenSystemByEmail(kayitlarRaw ?? [])

    const D = periyotSonGunu(yil, periyot)
    const label = periyot === 'yillik' ? 'YILLIK' : AYLAR_TR[(periyot as number) - 1]
    const satirlar = adabelPersonelBilgileriListeSnapshot({ D, kayitlar })

    const cols = 11
    const rows: (string | number)[][] = [
      padRow(cols, ['ADABEL Personel Bilgileri Listesi']),
      padRow(cols, [`Yıl: ${yil} · Sekme: ${label}`]),
      padRow(cols, [`Anlık görüntü tarihi: ${sonGunuMetin(D)}`]),
      padRow(cols, ['']),
      padRow(cols, [
        'Sıra No',
        'Sicil No',
        'Adı Soyadı',
        'TCKN',
        'Cinsiyet',
        'Doğum Tarihi',
        'Öğrenim',
        'Telefon',
        'E-Posta',
        'Kuruma Girişi Tarihi',
        'Görev Yeri',
      ]),
      ...satirlar.map((r, i) =>
        padRow(cols, [
          i + 1,
          r.sicil_no,
          r.ad_soyad,
          r.tckn,
          r.cinsiyet,
          r.dogum_tarihi,
          r.ogrenim,
          r.telefon,
          r.e_posta,
          r.kuruma_giris_tarihi,
          r.gorev_yeri,
        ]),
      ),
      padRow(cols, ['Toplam', '', '', '', '', '', '', '', '', '', satirlar.length]),
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
    ws['!cols'] = [
      { wch: 8 },
      { wch: 12 },
      { wch: 24 },
      { wch: 14 },
      { wch: 10 },
      { wch: 12 },
      { wch: 16 },
      { wch: 14 },
      { wch: 28 },
      { wch: 14 },
      { wch: 32 },
    ]

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
        cell.s = {
          font: { name: 'Calibri', sz: 11, bold: isTitle || isHead || isTotal },
          alignment: {
            vertical: 'center',
            horizontal: isTitle ? 'center' : c === 0 || c === 5 || c === 9 ? 'center' : 'left',
            wrapText: true,
          },
          ...(inData ? { border: THIN_BORDER } : {}),
        }
        if (isHead || isTotal) {
          cell.s.fill = { patternType: 'solid', fgColor: { rgb: isHead ? 'E5E7EB' : 'F1F5F9' } }
        }
      }
    }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'ADABEL Personel')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const filename = `ADABEL_Personel_Bilgileri_Listesi_${yil}_${label}.xlsx`
    const encodedFilename = encodeURIComponent(filename)
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="ADABEL_Personel_Bilgileri_Listesi.xlsx"; filename*=UTF-8''${encodedFilename}`,
      },
    })
  } catch (err) {
    console.error('ADABEL_PERSONEL_BILGILERI_LISTE_EXCEL_HATA', err)
    return NextResponse.json({ error: 'Excel olusturulamadi.' }, { status: 500 })
  }
}
