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
import { adreseGorePersonelListeSnapshot, type AdreseGorePersonelListeSatir } from '@/lib/rapor-adrese-gore-personel-liste'

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

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const yil = parseYil(searchParams.get('y'))
    const periyot = parsePeriyot(searchParams.get('p'))
    const D = periyotSonGunu(yil, periyot)

    const [{ data: tanimStatuRaw }, { data: kadroRaw }, { data: calisanRaw }] = await Promise.all([
      supabase.from('tanim_statu').select('statu_adi, sira_no'),
      supabase
        .from('kadro_hareketleri')
        .select('asil, statu, gorev_unvani, kadro_unvani, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu')
        .not('asil', 'is', null),
      supabase.from('calisan').select('sicil_no, ad_soyad, cinsiyet, adresi'),
    ])

    const tanimStatuler: TanimStatuRow[] = (tanimStatuRaw ?? []) as TanimStatuRow[]
    const kadro: KadroRaporRow[] = (kadroRaw ?? []) as KadroRaporRow[]
    const calisanBySicil = new Map<string, CalisanRaporRow & { adresi?: string | null }>()
    for (const c of calisanRaw ?? []) {
      calisanBySicil.set(c.sicil_no, {
        sicil_no: c.sicil_no,
        ad_soyad: c.ad_soyad,
        cinsiyet: c.cinsiyet,
        adresi: c.adresi,
      })
    }

    const satirlar = adreseGorePersonelListeSnapshot({
      D,
      tanimStatuler,
      kadro,
      calisanBySicil,
    })

    const label = periyot === 'yillik' ? 'YILLIK' : AYLAR_TR[(periyot as number) - 1]
    const rows: (string | number)[][] = [
      ['Adrese Göre Personel Listesi'],
      [`Yil: ${yil} · Sekme: ${label}`],
      [`Anlik goruntu tarihi: ${sonGunuMetin(D)}`],
      [''],
      ['Sira No', 'Sicil No', 'Adi Soyadi', 'Gorev Unvani', 'Adres Bilgisi'],
      ...satirlar.map((s: AdreseGorePersonelListeSatir, i: number) => [i + 1, s.sicil_no, s.ad_soyad, s.gorev_unvani, s.adres]),
      ['Toplam', '', '', '', satirlar.length],
    ]

    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
      { s: { r: rows.length - 1, c: 0 }, e: { r: rows.length - 1, c: 3 } },
    ]
    ws['!cols'] = [{ wch: 8 }, { wch: 14 }, { wch: 30 }, { wch: 18 }, { wch: 56 }]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Adrese Göre Personel')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const filename = `Adrese_Gore_Personel_Listesi_${yil}_${label}.xlsx`
    const encodedFilename = encodeURIComponent(filename)

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Adrese_Gore_Personel_Listesi.xlsx"; filename*=UTF-8''${encodedFilename}`,
      },
    })
  } catch (err) {
    console.error('ADRESE_GORE_PERSONEL_LISTE_EXCEL_HATA', err)
    return NextResponse.json({ error: 'Excel olusturulamadi.' }, { status: 500 })
  }
}
