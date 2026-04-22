import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'
import { type KadroRaporRow } from '@/lib/rapor-statuye-gore-cinsiyet'
import { aktifPersonelTehlikeSatirlari, parseRaporPeriyot, type TehlikeSinifi } from '@/lib/rapor-tehlike-sinifi'

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
    const ws = XLSX.utils.aoa_to_sheet([
      ['Tehlike Sınıfına Göre Personel Listesi'],
      [`Yıl: ${yil} · Sekme: ${label}`],
      [],
      ['Sıra No', 'Tehlike Sınıfı', 'Sicil No', 'Adı Soyadı', 'Müdürlük'],
      ...satirlar.map((r, i) => [i + 1, r.tehlike_sinifi, r.sicil_no, r.ad_soyad, r.mudurluk]),
    ])
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Tehlike Personel')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    return new NextResponse(buf, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="Tehlike_Sinifina_Gore_Personel_Listesi.xlsx"` } })
  } catch (err) {
    console.error('TEHLIKELI_PERSONEL_EXCEL_HATA', err)
    return NextResponse.json({ error: 'Excel olusturulamadi.' }, { status: 500 })
  }
}
