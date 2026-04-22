import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'
import { parseRaporPeriyot, type TehlikeSinifi } from '@/lib/rapor-tehlike-sinifi'

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
    const ws = XLSX.utils.aoa_to_sheet([
      ['Tehlike Sınıfına Göre Müdürlük Listesi'],
      [`Yıl: ${yil} · Sekme: ${label}`],
      [],
      ['Sıra No', 'Tehlike Sınıfı', 'Müdürlük'],
      ...satirlar.map((r, i) => [i + 1, r.tehlike_sinifi, r.mudurluk]),
    ])
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Tehlike Mudurluk')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    return new NextResponse(buf, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="Tehlike_Sinifina_Gore_Mudurluk_Listesi.xlsx"` } })
  } catch (err) {
    console.error('TEHLIKELI_MUDURLUK_EXCEL_HATA', err)
    return NextResponse.json({ error: 'Excel olusturulamadi.' }, { status: 500 })
  }
}
