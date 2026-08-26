import { fetchAllCalisanOgrenim, fetchAllKadroHareketleri } from '@/lib/supabase-sayfala'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'
import {
  periyotSonGunu,
  type CalisanRaporRow,
  type KadroRaporRow,
  type RaporPeriyot,
  type TanimStatuRow,
} from '@/lib/rapor-statuye-gore-cinsiyet'
import { mudurlugeGorePersonelListeSnapshot } from '@/lib/rapor-mudurluge-gore-personel-liste'

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
    const mudurlukFilterler = String(searchParams.get('m') ?? '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)

    const [{ data: tanimStatuRaw }, { data: kadroRaw }, { data: calisanRaw }, { data: ogrenimRaw }] = await Promise.all([
      supabase.from('tanim_statu').select('statu_adi, sira_no').eq('aktif', true),
      fetchAllKadroHareketleri(supabase, 'asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu, kadro_mudurlugu, kadro_unvani, gorev_unvani', q => q.not('asil', 'is', null)),
      supabase.from('calisan').select('sicil_no, ad_soyad, cinsiyet'),
      fetchAllCalisanOgrenim(supabase, 'sicil_no, ogrenim_turu, varsayilan'),
    ])

    const tanimStatuler: TanimStatuRow[] = (tanimStatuRaw ?? []).map(r => ({
      statu_adi: r.statu_adi,
      sira_no: r.sira_no,
    }))
    const kadro: KadroRaporRow[] = (kadroRaw ?? []) as KadroRaporRow[]
    const calisanBySicil = new Map<string, CalisanRaporRow>()
    for (const c of calisanRaw ?? []) {
      calisanBySicil.set(c.sicil_no, {
        sicil_no: c.sicil_no,
        ad_soyad: c.ad_soyad,
        cinsiyet: c.cinsiyet,
      })
    }
    const varsayilanOgrenimBySicil = new Map<string, string>()
    for (const o of ogrenimRaw ?? []) {
      if (!o?.varsayilan) continue
      const sicil = String(o.sicil_no ?? '').trim()
      if (!sicil) continue
      const ogrenimTuru = String(o.ogrenim_turu ?? '').trim()
      varsayilanOgrenimBySicil.set(sicil, ogrenimTuru || '—')
    }

    const D = periyotSonGunu(yil, periyot)
    const label = periyot === 'yillik' ? 'YILLIK' : AYLAR_TR[(periyot as number) - 1]
    let satirlar = mudurlugeGorePersonelListeSnapshot({
      D,
      tanimStatuler,
      kadro,
      calisanBySicil,
      varsayilanOgrenimBySicil,
    })
    if (mudurlukFilterler.length) {
      const set = new Set(mudurlukFilterler)
      satirlar = satirlar.filter(r => set.has(r.mudurluk))
    }

    const COLS = 7
    const rows: (string | number)[][] = [
      padRow(COLS, ['Müdürlüğe Göre Personel Listesi']),
      padRow(COLS, [`Yıl: ${yil} · Sekme: ${label}`]),
      padRow(COLS, [`Anlık görüntü tarihi: ${sonGunuMetin(D)}`]),
      padRow(COLS, [mudurlukFilterler.length ? `Müdürlük filtresi: ${mudurlukFilterler.join(', ')}` : 'Müdürlük filtresi: Tümü']),
      padRow(COLS, ['']),
      padRow(COLS, ['Sıra No', 'Sicil No', 'Adı Soyadı', 'Statü', 'Kadro Unvanı', 'Öğretim Türü', 'Müdürlük']),
      ...satirlar.map((s, i) => padRow(COLS, [i + 1, s.sicil_no, s.ad_soyad, s.statu, s.kadro_unvani, s.ogretim_turu, s.mudurluk])),
      padRow(COLS, ['Toplam', '', '', '', '', '', satirlar.length]),
    ]

    const ws = XLSX.utils.aoa_to_sheet(rows)
    const headerRow = 5
    const totalRow = headerRow + 1 + satirlar.length
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 6 } },
      { s: { r: totalRow, c: 0 }, e: { r: totalRow, c: 5 } },
    ]
    ws['!cols'] = [{ wch: 8 }, { wch: 14 }, { wch: 30 }, { wch: 14 }, { wch: 28 }, { wch: 16 }, { wch: 34 }]

    const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
    for (let r = 0; r <= range.e.r; r++) {
      for (let c = 0; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c })
        if (!ws[addr]) continue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cell = ws[addr] as any
        const isTitle = r <= 3
        const isHead = r === headerRow
        const isTotal = r === totalRow
        const inData = r >= headerRow && r <= totalRow

        cell.s = {
          font: {
            name: 'Calibri',
            sz: 11,
            bold: isTitle || isHead || isTotal,
          },
          alignment: {
            vertical: 'center',
            horizontal: isTitle ? 'center' : c === 0 ? 'center' : 'left',
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
    XLSX.utils.book_append_sheet(wb, ws, 'Mudurluge Gore Liste')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const filename = `Mudurluge_Gore_Personel_Listesi_${yil}_${label}.xlsx`
    const encodedFilename = encodeURIComponent(filename)

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Mudurluge_Gore_Personel_Listesi.xlsx"; filename*=UTF-8''${encodedFilename}`,
      },
    })
  } catch (err) {
    console.error('MUDURLUGE_GORE_PERSONEL_LISTE_EXCEL_HATA', err)
    return NextResponse.json({ error: 'Excel olusturulamadi.' }, { status: 500 })
  }
}
