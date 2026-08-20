import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { GorevYerineGoreListeSatir } from '@/lib/rapor-gorev-yerine-gore-liste'
import {
  gorevYerineGoreUnvanExcelRgb,
  gorevYerineGoreUnvanVurgu,
} from '@/lib/rapor-gorev-yerine-gore-liste'
import { gorevYeriListeSenkronizeEt } from '@/lib/rapor-gorev-yerine-gore-liste-sync'
import { gorevYerineGoreListeSatirlariYukle } from '@/lib/rapor-gorev-yerine-gore-liste-yukle'
import { gorevYeriIletisimSatirlariOlustur } from '@/lib/rapor-gorev-yerine-gore-iletisim'
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

    await gorevYeriListeSenkronizeEt(supabase, { revalidate: false })
    const { satirlar } = await gorevYerineGoreListeSatirlariYukle(supabase)

    const { data: ayarRaw } = await sb
      .from('rapor_gorev_yeri_liste_ayar')
      .select('kayit_key, sira_no')
      .order('sira_no', { ascending: true })

    const satirByKey = new Map(satirlar.map(s => [s.kayit_key, s] as const))
    const seciliKeys = (ayarRaw ?? [])
      .map((a: { kayit_key: string | null }) => String(a.kayit_key ?? '').trim())
      .filter(Boolean) as string[]
    let kayitListesi = seciliKeys
      .map((k: string) => satirByKey.get(k))
      .filter((s): s is GorevYerineGoreListeSatir => !!s)

    if (mudurlukFilterler.length) {
      const set = new Set(mudurlukFilterler)
      kayitListesi = kayitListesi.filter(r => set.has(r.mudurluk))
    }

    const kadroSiciller = kayitListesi
      .filter(s => s.kaynak === 'kadro' && s.sicil_no)
      .map(s => String(s.sicil_no))
    const firmaIds = kayitListesi
      .filter(s => s.kaynak === 'firma')
      .map(s => Number(s.kayit_key.replace(/^firma:/, '')))
      .filter(n => Number.isFinite(n) && n > 0)

    const telefonByKayitKey = new Map<string, string | null>()
    for (let i = 0; i < kadroSiciller.length; i += 120) {
      const part = kadroSiciller.slice(i, i + 120)
      if (!part.length) continue
      const { data } = await supabase.from('calisan').select('sicil_no, telefon').in('sicil_no', part)
      for (const c of data ?? []) telefonByKayitKey.set(`kadro:${c.sicil_no}`, c.telefon)
    }
    for (let i = 0; i < firmaIds.length; i += 120) {
      const part = firmaIds.slice(i, i + 120)
      if (!part.length) continue
      const { data } = await supabase.from('firma_calisanlar').select('id, telefon').in('id', part)
      for (const f of data ?? []) telefonByKayitKey.set(`firma:${f.id}`, f.telefon)
    }

    const iletisim = gorevYeriIletisimSatirlariOlustur(kayitListesi, telefonByKayitKey)
    const satirDolguRgb = iletisim.map(r => gorevYerineGoreUnvanExcelRgb(gorevYerineGoreUnvanVurgu(r.unvan, r.fiili_gorev)))

    return raporExcelStandartResponse({
      baslik: 'Görev Yerine Göre İletişim Bilgileri',
      donemEtiket: 'Sekme: YILLIK',
      anlikTarihEtiket: `Anlık görüntü tarihi: ${new Date().toLocaleDateString('tr-TR')}`,
      kolonlar: ['Sıra No', 'Adı Soyadı', 'Konum', 'Cinsiyet', 'Unvanı', 'Statü', 'Fiili Görevi', 'Telefon'],
      satirlar: iletisim.map((r, i) => [
        i + 1,
        r.ad_soyad,
        r.konum,
        r.cinsiyet,
        r.unvan,
        r.statu,
        r.fiili_gorev,
        r.telefon,
      ]),
      satirDolguRgb,
      sheetName: 'Gorev Yeri Iletisim',
      downloadFileName: 'Gorev_Yerine_Gore_Iletisim_Bilgileri.xlsx',
    })
  } catch (err) {
    console.error('GOREV_YERI_ILETISIM_EXCEL_HATA', err)
    return NextResponse.json({ error: 'Excel olusturulamadi.' }, { status: 500 })
  }
}
