import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { raporExcelStandartResponse } from '@/lib/rapor-excel-standart'
import {
  calisanAdHaritasiOlustur,
  gorevYeriDegisenPersonelSnapshot,
  kadroHaritalariOlustur,
} from '@/lib/rapor-gorev-yeri-degisen-personel'
import { parseRaporPeriyot } from '@/lib/rapor-tehlike-sinifi'
import { periyotSonGunu, type KadroRaporRow, type RaporPeriyot } from '@/lib/rapor-statuye-gore-cinsiyet'
import type { Tables } from '@/types/database'

export const dynamic = 'force-dynamic'

const MIN_YIL = 2000
const MAX_YIL = 2035

function parseYil(v: string | null): number {
  const parsed = Number.parseInt(v ?? '', 10)
  if (!Number.isFinite(parsed)) return new Date().getFullYear()
  return Math.min(MAX_YIL, Math.max(MIN_YIL, parsed))
}

function parsePeriyotParam(v: string | null): RaporPeriyot {
  if (v === 'yillik') return 'yillik'
  const n = Number.parseInt(v ?? '', 10)
  if (Number.isFinite(n) && n >= 1 && n <= 12) return n as RaporPeriyot
  return 'yillik'
}

function sonGunuMetin(D: string): string {
  const [y, m, d] = D.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const yil = parseYil(searchParams.get('y'))
    const periyot = parsePeriyotParam(searchParams.get('p'))
    const { label } = parseRaporPeriyot(yil, periyot === 'yillik' ? 'yillik' : String(periyot))
    const D = periyotSonGunu(yil, periyot)

    const [{ data: hareketRaw }, { data: calisanRaw }, { data: kadroRaw }, { data: firmaRaw }] =
      await Promise.all([
        supabase
          .from('personel_hareketleri')
          .select(
            'id, sicil_no, kadro_id, eski_gorev_yeri, yeni_gorev_yeri, yururluk_tarihi, kayit_tarihi, ise_baslama_tarihi, ayrilis_tarihi, ayrilis_nedeni',
          ),
        supabase.from('calisan').select('sicil_no, ad_soyad'),
        supabase
          .from('kadro_hareketleri')
          .select(
            'id, asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu, kadro_mudurlugu, gorev_mudurlugu',
          )
          .not('asil', 'is', null),
        supabase.from('firma_calisanlar').select('sicil_no'),
      ])

    const adBySicil = calisanAdHaritasiOlustur(calisanRaw ?? [])
    const adabelSiciller = new Set(
      (firmaRaw ?? []).map(f => f.sicil_no).filter((s): s is string => Boolean(s?.trim())),
    )
    const { kadroById, kadroBySicil } = kadroHaritalariOlustur((kadroRaw ?? []) as KadroRaporRow[] & { id?: number }[])

    const satirlar = gorevYeriDegisenPersonelSnapshot({
      yil,
      periyot,
      hareketler: (hareketRaw ?? []) as Tables<'personel_hareketleri'>[],
      adBySicil,
      adabelSiciller,
      kadroById,
      kadroBySicil,
    })

    return raporExcelStandartResponse({
      baslik: 'Görev Yeri Değişen Personel Listesi',
      donemEtiket: `Yıl: ${yil} · Sekme: ${label}`,
      anlikTarihEtiket: `Dönem sonu: ${sonGunuMetin(D)}`,
      kolonlar: ['Sıra No', 'Sicil No', 'Adı Soyadı', 'Eski Müdürlüğü', 'Yeni Müdürlüğü', 'Değişiklik Tarihi'],
      satirlar: satirlar.map((r, i) => [
        i + 1,
        r.sicil_no,
        r.ad_soyad,
        r.eski_mudurluk,
        r.yeni_mudurluk,
        r.degisiklik_tarihi,
      ]),
      sheetName: 'Gorev Yeri Degisen',
      downloadFileName: `ISG_Gorev_Yeri_Degisen_${yil}_${label}.xlsx`,
    })
  } catch (err) {
    console.error('ISG_GOREV_YERI_DEGISEN_EXCEL', err)
    return NextResponse.json({ error: 'Excel oluşturulamadı.' }, { status: 500 })
  }
}
