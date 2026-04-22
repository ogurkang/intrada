import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'
import { periyotSonGunu, type KadroRaporRow } from '@/lib/rapor-statuye-gore-cinsiyet'
import { secilenKadroSatirAsil } from '@/lib/kadro-statu-sec'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const yil = Number.parseInt(searchParams.get('y') ?? '', 10) || new Date().getFullYear()
    const p = searchParams.get('p')
    const periyot = p === 'yillik' || !p ? 'yillik' : Number.parseInt(p, 10)
    const D = periyotSonGunu(yil, periyot as never)
    const seciliKanlar = String(searchParams.get('k') ?? '').split(',').map(s => s.trim()).filter(Boolean)
    const seciliSet = new Set(seciliKanlar)
    const supabase = await createClient()
    const [{ data: kadroRaw }, { data: calisanRaw }] = await Promise.all([
      supabase.from('kadro_hareketleri').select('asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu').not('asil', 'is', null),
      supabase.from('calisan').select('sicil_no, ad_soyad, kan_grubu'),
    ])
    const byAsil = new Map<string, KadroRaporRow[]>()
    for (const k of (kadroRaw ?? []) as KadroRaporRow[]) {
      if (!k.asil) continue
      const list = byAsil.get(k.asil) ?? []
      list.push(k)
      byAsil.set(k.asil, list)
    }
    const calisanBySicil = new Map((calisanRaw ?? []).map(c => [c.sicil_no, c] as const))
    const satirlar = [...byAsil.entries()]
      .map(([sicil, rows]) => {
        const sec = secilenKadroSatirAsil(rows, D)
        if (!sec) return null
        const c = calisanBySicil.get(sicil)
        if (!c) return null
        const kg = c.kan_grubu?.trim() || 'Belirtilmemiş'
        if (seciliSet.size > 0 && !seciliSet.has(kg)) return null
        return { sicil_no: sicil, ad_soyad: c.ad_soyad, kan_grubu: kg }
      })
      .filter(Boolean)
      .sort((a, b) => a!.sicil_no.localeCompare(b!.sicil_no, 'tr', { numeric: true })) as {
      sicil_no: string
      ad_soyad: string
      kan_grubu: string
    }[]
    const ws = XLSX.utils.aoa_to_sheet([
      ['Kan Grubuna Göre Personel Listesi'],
      [`Yıl: ${yil}`],
      [],
      ['Sıra No', 'Sicil No', 'Adı Soyadı', 'Kan Grubu'],
      ...satirlar.map((r, i) => [i + 1, r.sicil_no, r.ad_soyad, r.kan_grubu]),
    ])
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Kan Grubu')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    return new NextResponse(buf, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="Kan_Grubuna_Gore_Personel_Listesi.xlsx"` } })
  } catch (err) {
    console.error('KAN_GRUBU_RAPOR_EXCEL_HATA', err)
    return NextResponse.json({ error: 'Excel olusturulamadi.' }, { status: 500 })
  }
}
