import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseRaporPeriyot, type TehlikeSinifi } from '@/lib/rapor-tehlike-sinifi'
import { raporExcelStandartResponse } from '@/lib/rapor-excel-standart'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const yil = Number.parseInt(searchParams.get('y') ?? '', 10) || new Date().getFullYear()
    const { label } = parseRaporPeriyot(yil, searchParams.get('p') ?? undefined)
    const supabase = await createClient()
    const { data: mudRaw } = await supabase
      .from('tanim_mudurluk')
      .select('tehlike_sinifi')
      .eq('aktif', true)

    const tehlikeSirasi: TehlikeSinifi[] = ['Az Tehlikeli', 'Tehlikeli', 'Çok Tehlikeli']
    const tehlikeSayilari = new Map<TehlikeSinifi, number>(tehlikeSirasi.map(k => [k, 0]))
    for (const m of mudRaw ?? []) {
      const sinif = (m.tehlike_sinifi as TehlikeSinifi) ?? 'Az Tehlikeli'
      tehlikeSayilari.set(sinif, (tehlikeSayilari.get(sinif) ?? 0) + 1)
    }
    const satirlar = tehlikeSirasi.map(sinif => ({
      tehlike_sinifi: sinif,
      mudurluk_sayisi: tehlikeSayilari.get(sinif) ?? 0,
    }))
    const toplam = satirlar.reduce((a, b) => a + b.mudurluk_sayisi, 0)
    return raporExcelStandartResponse({
      baslik: 'Tehlike Sınıflarına Göre Müdürlük Raporu',
      donemEtiket: `Yıl: ${yil} · Sekme: ${label}`,
      anlikTarihEtiket: `Anlık görüntü tarihi: ${new Date().toLocaleDateString('tr-TR')}`,
      kolonlar: ['Sıra No', 'Tehlike Sınıfı', 'Müdürlük Sayısı'],
      satirlar: satirlar.map((r, i) => [i + 1, r.tehlike_sinifi, r.mudurluk_sayisi]),
      sheetName: 'Tehlike Mudurluk',
      downloadFileName: 'Tehlike_Siniflarina_Gore_Mudurluk.xlsx',
      totalValue: toplam,
    })
  } catch (err) {
    console.error('TEHLIKE_MUDURLUK_EXCEL_HATA', err)
    return NextResponse.json({ error: 'Excel olusturulamadi.' }, { status: 500 })
  }
}
