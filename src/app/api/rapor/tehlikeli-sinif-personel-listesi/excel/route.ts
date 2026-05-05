import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { type KadroRaporRow } from '@/lib/rapor-statuye-gore-cinsiyet'
import { aktifPersonelTehlikeSatirlari, parseRaporPeriyot, type TehlikeSinifi } from '@/lib/rapor-tehlike-sinifi'
import { raporExcelStandartResponse } from '@/lib/rapor-excel-standart'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const yil = Number.parseInt(searchParams.get('y') ?? '', 10) || new Date().getFullYear()
    const { D, label } = parseRaporPeriyot(yil, searchParams.get('p') ?? undefined)
    const tehlikeFilter = String(searchParams.get('t') ?? '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean) as TehlikeSinifi[]
    const supabase = await createClient()
    const [{ data: mudRaw }, { data: kadroRaw }, { data: calisanRaw }] = await Promise.all([
      supabase.from('tanim_mudurluk').select('mudurluk_adi, tehlike_sinifi').eq('aktif', true),
      supabase.from('kadro_hareketleri').select('asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu, kadro_mudurlugu').not('asil', 'is', null),
      supabase.from('calisan').select('sicil_no, ad_soyad'),
    ])
    const tehlikeByMudurluk = new Map<string, TehlikeSinifi>()
    for (const m of mudRaw ?? []) tehlikeByMudurluk.set(m.mudurluk_adi, (m.tehlike_sinifi as TehlikeSinifi) ?? 'Az Tehlikeli')
    const calisanBySicil = new Map<string, { ad_soyad: string }>()
    for (const c of calisanRaw ?? []) calisanBySicil.set(c.sicil_no, { ad_soyad: c.ad_soyad })
    const tehlikeSira: Record<TehlikeSinifi, number> = {
      'Az Tehlikeli': 1,
      Tehlikeli: 2,
      'Çok Tehlikeli': 3,
    }
    const satirlar = aktifPersonelTehlikeSatirlari({ D, kadro: (kadroRaw ?? []) as KadroRaporRow[], calisanBySicil, tehlikeByMudurluk })
      .filter(r => (tehlikeFilter.length ? tehlikeFilter.includes(r.tehlike_sinifi) : true))
      .sort(
        (a, b) =>
          tehlikeSira[a.tehlike_sinifi] - tehlikeSira[b.tehlike_sinifi] ||
          a.mudurluk.localeCompare(b.mudurluk, 'tr') ||
          a.sicil_no.localeCompare(b.sicil_no, 'tr', { numeric: true }),
      )
    return raporExcelStandartResponse({
      baslik: 'Tehlike Sınıfına Göre Personel Listesi',
      donemEtiket: `Yıl: ${yil} · Sekme: ${label}`,
      anlikTarihEtiket: `Anlık görüntü tarihi: ${new Date().toLocaleDateString('tr-TR')}`,
      kolonlar: ['Sıra No', 'Tehlike Sınıfı', 'Sicil No', 'Adı Soyadı', 'Müdürlük'],
      satirlar: satirlar.map((r, i) => [i + 1, r.tehlike_sinifi, r.sicil_no, r.ad_soyad, r.mudurluk]),
      sheetName: 'Tehlike Personel',
      downloadFileName: 'Tehlike_Sinifina_Gore_Personel_Listesi.xlsx',
    })
  } catch (err) {
    console.error('TEHLIKELI_PERSONEL_EXCEL_HATA', err)
    return NextResponse.json({ error: 'Excel olusturulamadi.' }, { status: 500 })
  }
}
