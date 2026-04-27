import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'
import { filterOutGodmodeCalisan, filterOutHiddenSystemByEmail } from '@/lib/godmode-calisan'
import { secilenKadroSatirAsil } from '@/lib/kadro-statu-sec'
import { etiketAnahtari } from '@/lib/rapor-statuye-gore-cinsiyet'
import { FIRMA_STATU_ETIKET, TANIMSIZ_STATU_ETIKET, hazirlaStatuSirali, karsilastirStatuSonraSicilAd } from '@/lib/statu-liste-siralama'
import { gorevYerineGoreListeSatirUret, mudurlukKonumMetniHaritasi, type KadroGenis } from '@/lib/rapor-gorev-yerine-gore-liste'

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function bosKadro(sicil: string): KadroGenis {
  return {
    asil: sicil,
    statu: null,
    kuruma_giris_tarihi: null,
    memuriyet_tarihi: null,
    ayrilis_tarihi: null,
    durumu: null,
    kadro_mudurlugu: null,
    gorev_mudurlugu: null,
    gorev_unvani: null,
  }
}

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
    const D = new Date().toISOString().slice(0, 10)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calisanQuery = (supabase as any).from('calisan').select('sicil_no, ad_soyad, cinsiyet, gorev_yeri').order('ad_soyad')
    const [calisanResult, { data: phRaw }, { data: tanimStatuRaw }, { data: mudTanimRaw }] = await Promise.all([
      calisanQuery as Promise<{ data: any[] | null }>,
      supabase.from('personel_hareketleri').select('sicil_no, ayrilis_tarihi').order('yururluk_tarihi', { ascending: false }),
      supabase.from('tanim_statu').select('statu_adi, sira_no').eq('aktif', true),
      supabase.from('tanim_mudurluk').select('mudurluk_adi, konum').eq('aktif', true),
    ])
    const calisanRaw = calisanResult.data ?? []
    const sonAyrilisPerSicil = new Map<string, string | null>()
    for (const r of phRaw ?? []) if (!sonAyrilisPerSicil.has(r.sicil_no)) sonAyrilisPerSicil.set(r.sicil_no, r.ayrilis_tarihi)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calisanFiltreli = filterOutGodmodeCalisan(calisanRaw as any ?? []) as any[]
    const aktifSiciller = new Set<string>()
    calisanFiltreli.forEach(c => {
      if (!sonAyrilisPerSicil.get(c.sicil_no)) aktifSiciller.add(c.sicil_no)
    })
    const kadroCalisan = calisanFiltreli.filter(c => aktifSiciller.has(c.sicil_no))
    const { statuSirali, etiketler } = hazirlaStatuSirali(tanimStatuRaw ?? [])
    const mudKonum = mudurlukKonumMetniHaritasi(mudTanimRaw ?? [])
    const kadroByAsil = new Map<string, KadroGenis[]>()
    for (const part of chunk([...aktifSiciller], 120)) {
      const { data: kRows } = await supabase
        .from('kadro_hareketleri')
        .select('asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu, kadro_mudurlugu, gorev_mudurlugu, gorev_unvani')
        .in('asil', part)
      for (const r of kRows ?? []) {
        if (!r.asil) continue
        const list = kadroByAsil.get(r.asil) ?? []
        list.push(r as KadroGenis)
        kadroByAsil.set(r.asil, list)
      }
    }
    const kadroSatirlarRaw = kadroCalisan.map(c => {
      const sec = secilenKadroSatirAsil(kadroByAsil.get(c.sicil_no) ?? [], D)
      const k = sec ?? bosKadro(c.sicil_no)
      return { kayit_key: `kadro:${c.sicil_no}`, kind: 'kadro' as const, statuEtiket: etiketAnahtari(etiketler, sec?.statu) || TANIMSIZ_STATU_ETIKET, sicil_no: c.sicil_no, ad_soyad: c.ad_soyad, cinsiyet: c.cinsiyet, gorev_yeri: c.gorev_yeri, kadro: k }
    })
    const { data: firmaRaw } = await supabase.from('firma_calisanlar').select('id, sicil_no, ad_soyad, gorev_mudurlugu, gorevi, ayrilis_tarihi, e_posta, cinsiyet').order('ad_soyad')
    const firmaSatirlarRaw = filterOutHiddenSystemByEmail(firmaRaw ?? [])
      .map(f => ({ kayit_key: `firma:${f.id}`, kind: 'firma' as const, statuEtiket: FIRMA_STATU_ETIKET, sicil_no: f.sicil_no, ad_soyad: f.ad_soyad, cinsiyet: f.cinsiyet, gorev_mudurlugu: f.gorev_mudurlugu, gorevi: f.gorevi }))
    const sirali = [...kadroSatirlarRaw, ...firmaSatirlarRaw].sort((a, b) =>
      karsilastirStatuSonraSicilAd({ statuEtiket: a.statuEtiket, sicil_no: a.sicil_no, ad_soyad: a.ad_soyad }, { statuEtiket: b.statuEtiket, sicil_no: b.sicil_no, ad_soyad: b.ad_soyad }, statuSirali),
    )
    let satirlar = sirali.map(row =>
      gorevYerineGoreListeSatirUret(
        mudKonum,
        row.kind === 'kadro'
          ? { kayit_key: row.kayit_key, kind: 'kadro', sicil_no: row.sicil_no, ad_soyad: row.ad_soyad, cinsiyet: row.cinsiyet, gorev_yeri: row.gorev_yeri, statuEtiket: row.statuEtiket, kadro: row.kadro }
          : { kayit_key: row.kayit_key, kind: 'firma', sicil_no: row.sicil_no, ad_soyad: row.ad_soyad, cinsiyet: row.cinsiyet, gorev_mudurlugu: row.gorev_mudurlugu, gorevi: row.gorevi, statuEtiket: row.statuEtiket },
      ),
    )
    const { data: ayarRaw } = await sb
      .from('rapor_gorev_yeri_liste_ayar')
      .select('kayit_key, sira_no')
      .order('sira_no', { ascending: true })
    const satirByKey = new Map(satirlar.map(s => [s.kayit_key, s] as const))
    const seciliKeys: string[] = (ayarRaw ?? [])
      .map((a: { kayit_key: string | null }) => String(a.kayit_key ?? '').trim())
      .filter((k): k is string => Boolean(k))
    const ayarliSatirlar = seciliKeys
      .map((k: string) => satirByKey.get(k))
      .filter((x): x is (typeof satirlar)[number] => !!x)
    satirlar = ayarliSatirlar
    if (mudurlukFilterler.length) {
      const set = new Set(mudurlukFilterler)
      satirlar = satirlar.filter(r => set.has(r.mudurluk))
    }
    const rows: (string | number)[][] = [
      ['Görev Yerine Göre Personel Listesi'],
      [`Anlık görüntü tarihi: ${new Date().toLocaleDateString('tr-TR')}`],
      [],
      ['Sıra No', 'Adı Soyadı', 'Konum', 'Cinsiyet', 'Unvanı', 'Statü', 'Fiili Görevi'],
      ...satirlar.map((r, i) => [i + 1, r.ad_soyad, r.konum, r.cinsiyet, r.unvan, r.statu, r.fiili_gorev]),
    ]
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }]
    ws['!cols'] = [{ wch: 8 }, { wch: 24 }, { wch: 14 }, { wch: 12 }, { wch: 20 }, { wch: 14 }, { wch: 24 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Görev Yerine Göre')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Gorev_Yerine_Gore_Personel_Listesi.xlsx"`,
      },
    })
  } catch (err) {
    console.error('GOREV_YERI_EXCEL_HATA', err)
    return NextResponse.json({ error: 'Excel olusturulamadi.' }, { status: 500 })
  }
}
