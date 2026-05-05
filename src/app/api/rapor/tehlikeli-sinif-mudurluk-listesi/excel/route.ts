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
      .select('mudurluk_adi, tehlike_sinifi')
      .eq('aktif', true)
    const tehlikeSira: Record<TehlikeSinifi, number> = {
      'Az Tehlikeli': 1,
      Tehlikeli: 2,
      'Çok Tehlikeli': 3,
    }
    const satirlar = (mudRaw ?? [])
      .map(r => ({ mudurluk: r.mudurluk_adi, tehlike_sinifi: ((r.tehlike_sinifi as TehlikeSinifi) ?? 'Az Tehlikeli') as TehlikeSinifi }))
      .sort((a, b) => tehlikeSira[a.tehlike_sinifi] - tehlikeSira[b.tehlike_sinifi] || a.mudurluk.localeCompare(b.mudurluk, 'tr'))
    return raporExcelStandartResponse({
      baslik: 'Tehlike Sınıfına Göre Müdürlük Listesi',
      donemEtiket: `Yıl: ${yil} · Sekme: ${label}`,
      anlikTarihEtiket: `Anlık görüntü tarihi: ${new Date().toLocaleDateString('tr-TR')}`,
      kolonlar: ['Sıra No', 'Tehlike Sınıfı', 'Müdürlük'],
      satirlar: satirlar.map((r, i) => [i + 1, r.tehlike_sinifi, r.mudurluk]),
      sheetName: 'Tehlike Mudurluk',
      downloadFileName: 'Tehlike_Sinifina_Gore_Mudurluk_Listesi.xlsx',
    })
  } catch (err) {
    console.error('TEHLIKELI_MUDURLUK_EXCEL_HATA', err)
    return NextResponse.json({ error: 'Excel olusturulamadi.' }, { status: 500 })
  }
}
