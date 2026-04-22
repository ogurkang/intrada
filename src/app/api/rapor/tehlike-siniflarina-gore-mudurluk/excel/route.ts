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
    const rows: (string | number)[][] = [
      ['Tehlike Sınıflarına Göre Müdürlük Raporu'],
      [`Yıl: ${yil} · Sekme: ${label}`],
      [],
      ['Sıra No', 'Tehlike Sınıfı', 'Müdürlük Sayısı'],
      ...satirlar.map((r, i) => [i + 1, r.tehlike_sinifi, r.mudurluk_sayisi]),
      ['', 'Toplam', toplam],
    ]
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } }]
    ws['!cols'] = [{ wch: 8 }, { wch: 28 }, { wch: 18 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Tehlike Müdürlük')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Tehlike_Siniflarina_Gore_Mudurluk.xlsx"`,
      },
    })
  } catch (err) {
    console.error('TEHLIKE_MUDURLUK_EXCEL_HATA', err)
    return NextResponse.json({ error: 'Excel olusturulamadi.' }, { status: 500 })
  }
}
