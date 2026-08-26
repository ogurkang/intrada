import { fetchAllKadroHareketleri } from '@/lib/supabase-sayfala'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { periyotSonGunu, type KadroRaporRow } from '@/lib/rapor-statuye-gore-cinsiyet'
import { secilenKadroSatirAsil } from '@/lib/kadro-statu-sec'
import { raporExcelStandartResponse } from '@/lib/rapor-excel-standart'

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
      fetchAllKadroHareketleri(supabase, 'asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu', q => q.not('asil', 'is', null)),
      supabase.from('calisan').select('sicil_no, ad_soyad, kan_grubu, telefon'),
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
        return { sicil_no: sicil, ad_soyad: c.ad_soyad, telefon: c.telefon?.trim() || '—', kan_grubu: kg }
      })
      .filter(Boolean)
      .sort((a, b) => a!.sicil_no.localeCompare(b!.sicil_no, 'tr', { numeric: true })) as {
      sicil_no: string
      ad_soyad: string
      telefon: string
      kan_grubu: string
    }[]
    const periodLabel = periyot === 'yillik' ? 'YILLIK' : String(periyot)
    return raporExcelStandartResponse({
      baslik: 'Kan Grubuna Göre Personel Listesi',
      donemEtiket: `Yıl: ${yil} · Sekme: ${periodLabel}`,
      anlikTarihEtiket: `Anlık görüntü tarihi: ${new Date().toLocaleDateString('tr-TR')}`,
      kolonlar: ['Sıra No', 'Sicil No', 'Adı Soyadı', 'Telefon', 'Kan Grubu'],
      satirlar: satirlar.map((r, i) => [i + 1, r.sicil_no, r.ad_soyad, r.telefon, r.kan_grubu]),
      sheetName: 'Kan Grubu',
      downloadFileName: 'Kan_Grubuna_Gore_Personel_Listesi.xlsx',
    })
  } catch (err) {
    console.error('KAN_GRUBU_RAPOR_EXCEL_HATA', err)
    return NextResponse.json({ error: 'Excel olusturulamadi.' }, { status: 500 })
  }
}
