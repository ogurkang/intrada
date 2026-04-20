import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'
import {
  isciIzinRaporSnapshot,
  type IsciIzinHakRow,
  type IsciIzinHareketRow,
} from '@/lib/rapor-isci-izinleri'
import { periyotSonGunu, type KadroRaporRow, type RaporPeriyot } from '@/lib/rapor-statuye-gore-cinsiyet'

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

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const yil = parseYil(searchParams.get('y'))
    const periyot = parsePeriyot(searchParams.get('p'))
    const D = periyotSonGunu(yil, periyot)

    const [
      { data: kadroRaw },
      { data: calisanRaw },
      { data: hakRaw },
      { data: hareketRaw },
      { data: izinTurRaw },
    ] = await Promise.all([
      supabase
        .from('kadro_hareketleri')
        .select('asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu')
        .not('asil', 'is', null),
      supabase.from('calisan').select('sicil_no, ad_soyad'),
      supabase.from('izin_haklari').select('sicil_no, devreden_gun, hak_edilen_gun').eq('yil', yil),
      supabase
        .from('izin_hareketleri')
        .select('sicil_no, tur, ayrilis, baslama, kayit_tarihi, gun, durum')
        .eq('yil', yil),
      supabase
        .from('tanim_izin_tur')
        .select('tur_adi')
        .in('izin_hakki_kullanimi', ['Evet', 'Yıllık İzin']),
    ])

    const kadro: KadroRaporRow[] = (kadroRaw ?? []) as KadroRaporRow[]
    const hareketler: IsciIzinHareketRow[] = (hareketRaw ?? []) as IsciIzinHareketRow[]
    const hakBySicil = new Map<string, IsciIzinHakRow>()
    for (const h of (hakRaw ?? []) as IsciIzinHakRow[]) {
      hakBySicil.set(h.sicil_no, h)
    }
    const calisanBySicil = new Map<string, { ad_soyad: string }>()
    for (const c of calisanRaw ?? []) {
      calisanBySicil.set(c.sicil_no, { ad_soyad: c.ad_soyad ?? c.sicil_no })
    }
    const hakKullananTurler = new Set((izinTurRaw ?? []).map(t => t.tur_adi))

    const satirlar = isciIzinRaporSnapshot({
      yil,
      periyot,
      D,
      kadro,
      calisanBySicil,
      hakBySicil,
      hareketler,
      hakKullananTurler,
    })

    const rows: (string | number)[][] = [
      ['İşçi İzinleri Raporu'],
      [`Yıl: ${yil} · Dönem sonu: ${sonGunuMetin(D)}`],
      [''],
      ['Sıra No', 'Sicil No', 'Adı Soyadı', 'Devreden İzin', 'Hak Edilen İzin', 'Kullanılan İzin', 'Kalan İzin'],
      ...satirlar.map((r, i) => [
        i + 1,
        r.sicil_no,
        r.ad_soyad,
        r.devreden_izin,
        r.hak_edilen_izin,
        r.kullanilan_izin,
        r.kalan_izin,
      ]),
    ]

    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
    ]
    ws['!cols'] = [{ wch: 10 }, { wch: 12 }, { wch: 28 }, { wch: 14 }, { wch: 15 }, { wch: 14 }, { wch: 12 }]

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
          alignment: { vertical: 'center', horizontal: c === 0 || c >= 3 ? 'center' : 'left', wrapText: true },
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
    XLSX.utils.book_append_sheet(wb, ws, 'Isci Izinleri')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const filename = `Isci_Izinleri_Raporu_${yil}_${periyot === 'yillik' ? 'YILLIK' : `AY-${periyot}`}.xlsx`
    const encodedFilename = encodeURIComponent(filename)

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Isci_Izinleri_Raporu.xlsx"; filename*=UTF-8''${encodedFilename}`,
      },
    })
  } catch (err) {
    console.error('ISCI_IZINLERI_EXCEL_HATA', err)
    return NextResponse.json({ error: 'Excel oluşturulamadı.' }, { status: 500 })
  }
}
