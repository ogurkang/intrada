import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'
import { type KadroRaporRow } from '@/lib/rapor-statuye-gore-cinsiyet'
import { aktifPersonelTehlikeSatirlari, parseRaporPeriyot, tehlikeMudurlukOzet, type TehlikeSinifi } from '@/lib/rapor-tehlike-sinifi'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const yil = Number.parseInt(searchParams.get('y') ?? '', 10) || new Date().getFullYear()
    const { D, label } = parseRaporPeriyot(yil, searchParams.get('p') ?? undefined)
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
    const satirlar = tehlikeMudurlukOzet(aktifPersonelTehlikeSatirlari({ D, kadro: (kadroRaw ?? []) as KadroRaporRow[], calisanBySicil, tehlikeByMudurluk })).filter(r => r.tehlike_sinifi === 'Tehlikeli')
    const ws = XLSX.utils.aoa_to_sheet([
      ['Tehlikeli Sınıfına Göre Müdürlük Listesi'],
      [`Yıl: ${yil} · Sekme: ${label}`],
      [],
      ['Sıra No', 'Müdürlük', 'Personel Sayısı'],
      ...satirlar.map((r, i) => [i + 1, r.mudurluk, r.personel_sayisi]),
    ])
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Tehlikeli Müdürlük')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    return new NextResponse(buf, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="Tehlikeli_Mudurluk_Listesi.xlsx"` } })
  } catch (err) {
    console.error('TEHLIKELI_MUDURLUK_EXCEL_HATA', err)
    return NextResponse.json({ error: 'Excel olusturulamadi.' }, { status: 500 })
  }
}
