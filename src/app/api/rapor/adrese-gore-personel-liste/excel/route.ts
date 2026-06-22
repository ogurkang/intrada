import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  periyotSonGunu,
  type CalisanRaporRow,
  type KadroRaporRow,
  type RaporPeriyot,
  type TanimStatuRow,
} from '@/lib/rapor-statuye-gore-cinsiyet'
import {
  adreseGorePersonelListeSnapshot,
  adreseGorePersonelListeFiltrele,
  type AdreseGorePersonelListeSatir,
  type PersonelAdresBilgi,
} from '@/lib/rapor-adrese-gore-personel-liste'
import { raporExcelStandartResponse } from '@/lib/rapor-excel-standart'

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
    const il = String(searchParams.get('il') ?? '').trim()
    const ilce = String(searchParams.get('ilce') ?? '').trim()
    const mahalle = String(searchParams.get('mahalle') ?? '').trim()
    const D = periyotSonGunu(yil, periyot)

    const [{ data: tanimStatuRaw }, { data: kadroRaw }, { data: calisanRaw }, { data: mahalleRaw }] =
      await Promise.all([
        supabase.from('tanim_statu').select('statu_adi, sira_no'),
        supabase
          .from('kadro_hareketleri')
          .select('asil, statu, gorev_unvani, kadro_unvani, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu')
          .not('asil', 'is', null),
        supabase.from('calisan').select('sicil_no, ad_soyad, cinsiyet, mahalle_id, adres_detay, adresi'),
        supabase.from('tanim_adres_mahalle').select('id, il, ilce, mahalle_adi'),
      ])

    const tanimStatuler: TanimStatuRow[] = (tanimStatuRaw ?? []) as TanimStatuRow[]
    const kadro: KadroRaporRow[] = (kadroRaw ?? []) as KadroRaporRow[]

    const mahalleById = new Map<number, { il: string; ilce: string; mahalle_adi: string }>()
    for (const m of mahalleRaw ?? []) {
      mahalleById.set(m.id, {
        il: String(m.il ?? '').trim(),
        ilce: String(m.ilce ?? '').trim(),
        mahalle_adi: String(m.mahalle_adi ?? '').trim(),
      })
    }

    const calisanBySicil = new Map<string, CalisanRaporRow>()
    const adresBySicil = new Map<string, PersonelAdresBilgi>()
    for (const c of calisanRaw ?? []) {
      calisanBySicil.set(c.sicil_no, { sicil_no: c.sicil_no, ad_soyad: c.ad_soyad, cinsiyet: c.cinsiyet })
      const m = c.mahalle_id != null ? mahalleById.get(c.mahalle_id) ?? null : null
      adresBySicil.set(c.sicil_no, {
        il: m?.il ?? '',
        ilce: m?.ilce ?? '',
        mahalle: m?.mahalle_adi ?? '',
        adres_detay: String(c.adres_detay ?? '').trim(),
        legacy_adresi: String(c.adresi ?? '').trim(),
      })
    }

    const tumSatirlar = adreseGorePersonelListeSnapshot({
      D,
      tanimStatuler,
      kadro,
      calisanBySicil,
      adresBySicil,
    })
    const satirlar = adreseGorePersonelListeFiltrele(tumSatirlar, { il, ilce, mahalle })

    const label = periyot === 'yillik' ? 'YILLIK' : AYLAR_TR[(periyot as number) - 1]
    const filtreParcalari = [il, ilce, mahalle].filter(Boolean)
    const filtreEtiket = filtreParcalari.length ? `Filtre: ${filtreParcalari.join(' / ')}` : 'Filtre: Tümü'

    return raporExcelStandartResponse({
      baslik: 'Adrese Göre Personel Listesi',
      donemEtiket: `Yıl: ${yil} · Sekme: ${label} · ${filtreEtiket}`,
      anlikTarihEtiket: `Anlık görüntü tarihi: ${sonGunuMetin(D)}`,
      kolonlar: ['Sıra No', 'Sicil No', 'Adı Soyadı', 'Görev Unvanı', 'İl', 'İlçe', 'Mahalle', 'Açık Adres'],
      satirlar: satirlar.map((s: AdreseGorePersonelListeSatir, i: number) => [
        i + 1,
        s.sicil_no,
        s.ad_soyad,
        s.gorev_unvani,
        s.il,
        s.ilce,
        s.mahalle,
        s.adres,
      ]),
      sheetName: 'Adrese Göre Personel',
      downloadFileName: `Adrese_Gore_Personel_Listesi_${yil}_${label}.xlsx`,
    })
  } catch (err) {
    console.error('ADRESE_GORE_PERSONEL_LISTE_EXCEL_HATA', err)
    return NextResponse.json({ error: 'Excel olusturulamadi.' }, { status: 500 })
  }
}
