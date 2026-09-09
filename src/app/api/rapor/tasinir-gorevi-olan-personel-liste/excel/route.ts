import { fetchAllKadroHareketleri } from '@/lib/supabase-sayfala'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { periyotSonGunu, type KadroRaporRow } from '@/lib/rapor-statuye-gore-cinsiyet'
import { raporExcelStandartResponse } from '@/lib/rapor-excel-standart'
import { tasinirGoreviListeFiltrele, tasinirGoreviListeSnapshot } from '@/lib/rapor-tasinir-gorevi-liste'
import { tasinirGoreviNormalize } from '@/lib/tasinir-gorevi'

const AYLAR_TR = [
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
]

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const yil = Number.parseInt(searchParams.get('y') ?? '', 10) || new Date().getFullYear()
    const p = searchParams.get('p')
    const periyot = p === 'yillik' || !p ? 'yillik' : Number.parseInt(p, 10)
    const D = periyotSonGunu(yil, periyot as never)
    const supabase = await createClient()
    const [{ data: kadroRaw }, { data: calisanRaw }] = await Promise.all([
      fetchAllKadroHareketleri(
        supabase,
        'asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu, kadro_unvani, gorev_unvani, gorev_mudurlugu, kadro_mudurlugu',
        q => q.not('asil', 'is', null),
      ),
      supabase.from('calisan').select('sicil_no, ad_soyad, tasinir_gorevi'),
    ])
    const g = tasinirGoreviNormalize(searchParams.get('g')) ?? ''
    const satirlar = tasinirGoreviListeFiltrele(
      tasinirGoreviListeSnapshot({
        D,
        kadro: (kadroRaw ?? []) as KadroRaporRow[],
        calisanlar: calisanRaw ?? [],
      }),
      g,
    )
    const periodLabel = periyot === 'yillik' ? 'YILLIK' : AYLAR_TR[(periyot as number) - 1] ?? String(periyot)
    const gorevEtiket = g || 'Tümü'
    const [y, m, d] = D.split('-').map(Number)
    const anlik = new Date(y, m - 1, d).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    return raporExcelStandartResponse({
      baslik: 'Taşınır Görevi Olan Personel Listesi',
      donemEtiket: `Yıl: ${yil} · Sekme: ${periodLabel} · Görev: ${gorevEtiket}`,
      anlikTarihEtiket: `Anlık görüntü tarihi: ${anlik}`,
      kolonlar: ['Sıra No', 'Sicil No', 'Adı Soyadı', 'Taşınır Görevi', 'Unvan', 'Müdürlük'],
      satirlar: satirlar.map((r, i) => [
        i + 1,
        r.sicil_no,
        r.ad_soyad,
        r.tasinir_gorevi,
        r.gorev_unvani,
        r.gorev_mudurlugu,
      ]),
      sheetName: 'Tasinir Gorevi',
      downloadFileName: 'Tasinir_Gorevi_Olan_Personel_Listesi.xlsx',
    })
  } catch (err) {
    console.error('TASINIR_GOREVI_RAPOR_EXCEL_HATA', err)
    return NextResponse.json({ error: 'Excel olusturulamadi.' }, { status: 500 })
  }
}
