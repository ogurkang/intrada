import { fetchAllKadroHareketleri } from '@/lib/supabase-sayfala'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchPersonelSendikaAtDate } from '@/lib/personel-sendika-load'
import {
  parseSendikaIdsParam,
  parseStatuParam,
  sendikaBilgilerineGorePersonelListe,
} from '@/lib/rapor-sendika-bilgileri'
import { periyotSonGunu, type KadroRaporRow } from '@/lib/rapor-statuye-gore-cinsiyet'
import { raporExcelStandartResponse } from '@/lib/rapor-excel-standart'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const yil = Number.parseInt(searchParams.get('y') ?? '', 10) || new Date().getFullYear()
    const p = searchParams.get('p')
    const periyot = p === 'yillik' || !p ? 'yillik' : Number.parseInt(p, 10)
    const D = periyotSonGunu(yil, periyot as never)
    const seciliSendikaIds = parseSendikaIdsParam(searchParams.get('s') ?? undefined)
    const seciliStatuler = parseStatuParam(searchParams.get('st') ?? undefined)
    const sendikaSet = new Set(seciliSendikaIds)
    const statuSet = new Set(seciliStatuler)

    const supabase = await createClient()
    const [{ data: kadroRaw }, { data: calisanRaw }, { data: mudurlukRaw }, sendikaBySicil] = await Promise.all([
      fetchAllKadroHareketleri(supabase, 'asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu, kadro_mudurlugu, gorev_mudurlugu', q => q.not('asil', 'is', null)),
      supabase.from('calisan').select('sicil_no, ad_soyad, telefon'),
      supabase.from('tanim_mudurluk').select('id, mudurluk_adi'),
      fetchPersonelSendikaAtDate(supabase, D),
    ])

    const kadroByAsil = new Map<string, KadroRaporRow[]>()
    for (const k of (kadroRaw ?? []) as KadroRaporRow[]) {
      if (!k.asil) continue
      const list = kadroByAsil.get(k.asil) ?? []
      list.push(k)
      kadroByAsil.set(k.asil, list)
    }
    const mudurlukById = new Map((mudurlukRaw ?? []).map(m => [m.id, m.mudurluk_adi] as const))
    const calisanlar = (calisanRaw ?? []).map(c => ({
      sicil_no: c.sicil_no,
      ad_soyad: c.ad_soyad ?? c.sicil_no,
      telefon: c.telefon,
    }))

    let satirlar = sendikaBilgilerineGorePersonelListe(D, calisanlar, kadroByAsil, sendikaBySicil, mudurlukById)
    if (sendikaSet.size) satirlar = satirlar.filter(r => sendikaSet.has(r.sendika_id))
    if (statuSet.size) satirlar = satirlar.filter(r => statuSet.has(r.statu))

    const periodLabel = periyot === 'yillik' ? 'YILLIK' : String(periyot)
    return raporExcelStandartResponse({
      baslik: 'Sendika Bilgilerine Göre Personel Listesi',
      donemEtiket: `Yıl: ${yil} · Sekme: ${periodLabel}`,
      anlikTarihEtiket: `Anlık görüntü tarihi: ${new Date(D + 'T12:00:00').toLocaleDateString('tr-TR')}`,
      kolonlar: ['Sıra No', 'Sicil No', 'Adı Soyadı', 'Müdürlüğü', 'Statü', 'Cep Telefonu', 'Sendika Kısa Adı'],
      satirlar: satirlar.map((r, i) => [i + 1, r.sicil_no, r.ad_soyad, r.mudurluk, r.statu, r.telefon, r.kisa_ad]),
      sheetName: 'Sendika Personel',
      downloadFileName: 'Sendika_Bilgilerine_Gore_Personel_Listesi.xlsx',
    })
  } catch (err) {
    console.error('SENDIKA_LISTE_RAPOR_EXCEL_HATA', err)
    return NextResponse.json({ error: 'Excel olusturulamadi.' }, { status: 500 })
  }
}
