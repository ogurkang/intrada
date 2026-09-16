import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  gorevYerineGoreUnvanExcelRgb,
  gorevYerineGoreUnvanVurgu,
} from '@/lib/rapor-gorev-yerine-gore-liste'
import { gorevYerineGoreListeSatirlariYukle } from '@/lib/rapor-gorev-yerine-gore-liste-yukle'
import { raporExcelStandartResponse } from '@/lib/rapor-excel-standart'

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const url = new URL(req.url)
    const mudurlukFilterler = String(url.searchParams.get('m') ?? '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
    const { satirlar: hamSatirlar, hata } = await gorevYerineGoreListeSatirlariYukle(supabase)
    if (hata) {
      return NextResponse.json({ error: hata }, { status: 500 })
    }
    const { data: ayarRaw } = await sb
      .from('rapor_gorev_yeri_liste_ayar')
      .select('kayit_key, sira_no')
      .order('sira_no', { ascending: true })
    const satirByKey = new Map(hamSatirlar.map(s => [s.kayit_key, s] as const))
    const seciliKeys = (ayarRaw ?? [])
      .map((a: { kayit_key: string | null }) => String(a.kayit_key ?? '').trim())
      .filter(Boolean) as string[]
    let satirlar = seciliKeys
      .map((k: string) => satirByKey.get(k))
      .filter((x): x is (typeof hamSatirlar)[number] => !!x)
    if (mudurlukFilterler.length) {
      const set = new Set(mudurlukFilterler)
      satirlar = satirlar.filter(r => set.has(r.mudurluk))
    }
    const satirDolguRgb = satirlar.map(r => gorevYerineGoreUnvanExcelRgb(gorevYerineGoreUnvanVurgu(r.unvan, r.fiili_gorev)))
    return raporExcelStandartResponse({
      baslik: 'Görev Yerine Göre Personel Listesi',
      donemEtiket: 'Sekme: YILLIK',
      anlikTarihEtiket: `Anlık görüntü tarihi: ${new Date().toLocaleDateString('tr-TR')}`,
      kolonlar: ['Sıra No', 'Adı Soyadı', 'Konum', 'Cinsiyet', 'Unvanı', 'Statü', 'Fiili Görevi'],
      satirlar: satirlar.map((r, i) => [i + 1, r.ad_soyad, r.konum, r.cinsiyet, r.unvan, r.statu, r.fiili_gorev]),
      satirDolguRgb,
      sheetName: 'Gorev Yerine Gore',
      downloadFileName: 'Gorev_Yerine_Gore_Personel_Listesi.xlsx',
    })
  } catch (err) {
    console.error('GOREV_YERI_EXCEL_HATA', err)
    return NextResponse.json({ error: 'Excel olusturulamadi.' }, { status: 500 })
  }
}
