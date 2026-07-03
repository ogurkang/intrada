import type { Tables } from '@/types/database'
import { yukleGidisAyrilisNedenleri } from '@/lib/hareket-tanim-gidis'

type KH = Tables<'kadro_hareketleri'>
type TH = Tables<'terfi_hareketleri'>
type BosKadroSecenek = Pick<
  KH,
  'id' | 'kadro_sira_no' | 'kadro_derecesi' | 'kadro_unvani' | 'gorev_unvani' | 'kadro_mudurlugu' | 'gorev_mudurlugu' | 'statu' | 'durumu'
>

const BOS_KADRO_SELECT =
  'id, kadro_sira_no, kadro_derecesi, kadro_unvani, gorev_unvani, kadro_mudurlugu, gorev_mudurlugu, statu, durumu'

async function yukleBosKadrolar(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
): Promise<BosKadroSecenek[]> {
  const batchSize = 1000
  let from = 0
  const out: BosKadroSecenek[] = []

  while (true) {
    const to = from + batchSize - 1
    const { data, error } = await supabase
      .from('kadro_hareketleri')
      .select(BOS_KADRO_SELECT)
      .eq('statu', 'Memur')
      .eq('durumu', 'Boş')
      .is('iptal_karar_tarihi', null)
      .is('iptal_karar_no', null)
      .is('ayrilis_tarihi', null)
      .order('kadro_sira_no', { ascending: true })
      .range(from, to)
    if (error) throw error

    const rows = (data ?? []) as BosKadroSecenek[]
    out.push(...rows)
    if (rows.length < batchSize) break
    from += batchSize
  }

  return out
}

export type PersonelHareketDegistirVeri = {
  personel: Tables<'calisan'> | null
  personeller: { sicil_no: string; ad_soyad: string }[]
  ogrenimDurumu: string | null
  seciliKadro: KH | null
  seciliKadroRol: 'asil' | 'vekil'
  bosKadrolar: BosKadroSecenek[]
  mudurlukler: string[]
  unvanlar: { id: number; ad: string; sinif: string | null }[]
  onaylayan: string
  yardimcilar: { sicil: string; ad: string }[]
  terfiSon: TH | null
  gostergeler: { derece: number; kademe: number; gosterge: number }[]
  ayrilisNedenleri: string[]
  sonHareketAyrilis: { tarih: string | null; nedeni: string | null }
}

export async function yuklePersonelHareketDegistirVeri(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  sicil_no: string | null,
  opts?: { yeniKayit?: boolean; seciliKadroId?: number; seciliRol?: string },
): Promise<PersonelHareketDegistirVeri> {
  const yeniKayit = opts?.yeniKayit ?? false
  const sicil = sicil_no?.trim() ?? ''
  const seciliKadroId = opts?.seciliKadroId ?? NaN
  const seciliRol = String(opts?.seciliRol ?? '').trim().toLowerCase()

  const [
    personelRes,
    kadroRes,
    mudurlukRes,
    unvanRes,
    ogrenimRes,
    terfiRes,
    sonHareketRes,
    tumBosKadrolar,
    gostergeRes,
    personelListeRes,
  ] = await Promise.all([
    sicil
      ? supabase.from('calisan').select('*').eq('sicil_no', sicil).maybeSingle()
      : Promise.resolve({ data: null as Tables<'calisan'> | null }),
    sicil
      ? supabase
          .from('kadro_hareketleri')
          .select('*')
          .or(`asil.eq.${sicil},vekil.eq.${sicil}`)
          .is('ayrilis_tarihi', null)
          .eq('statu', 'Memur')
      : Promise.resolve({ data: [] as KH[] }),
    supabase.from('tanim_mudurluk').select('mudurluk_adi').eq('aktif', true).order('mudurluk_adi'),
    supabase.from('tanim_unvan').select('id, unvan_adi, sinif_adi').eq('aktif', true).order('sira_no'),
    sicil
      ? supabase
          .from('calisan_ogrenim')
          .select('ogrenim_turu, okul_adi, varsayilan, kayit_zamani')
          .eq('sicil_no', sicil)
          .eq('aktif', true)
          .order('varsayilan', { ascending: false })
          .order('kayit_zamani', { ascending: false })
          .limit(1)
      : Promise.resolve({ data: [] as { ogrenim_turu?: string | null; okul_adi?: string | null }[] }),
    sicil
      ? supabase.from('terfi_hareketleri').select('*').eq('sicil_no', sicil).order('kayit_zamani', { ascending: false }).limit(1)
      : Promise.resolve({ data: [] as TH[] }),
    sicil
      ? supabase
          .from('personel_hareketleri')
          .select('ayrilis_tarihi, ayrilis_nedeni')
          .eq('sicil_no', sicil)
          .order('kayit_zamani', { ascending: false })
          .limit(1)
      : Promise.resolve({ data: [] as { ayrilis_tarihi: string | null; ayrilis_nedeni: string | null }[] }),
    yukleBosKadrolar(supabase),
    supabase.from('tanim_gosterge').select('derece, kademe, gosterge').eq('aktif', true),
    supabase.from('calisan').select('sicil_no, ad_soyad').order('ad_soyad'),
  ])

  const personel = personelRes.data ?? null
  const kadrolar = (kadroRes.data ?? []) as KH[]
  const personeller = (personelListeRes.data ?? []) as { sicil_no: string; ad_soyad: string }[]
  const terfiSon = ((terfiRes.data ?? [])[0] ?? null) as TH | null
  const sonHareketRaw = ((sonHareketRes.data ?? [])[0] ?? null) as { ayrilis_tarihi: string | null; ayrilis_nedeni: string | null } | null

  const vekiller = kadrolar.filter(k => (k.vekil ?? '').trim() === sicil)
  const asiller = kadrolar.filter(k => (k.asil ?? '').trim() === sicil)
  const kadroListesi = [...vekiller, ...asiller]
  if (kadroListesi.length === 0) kadroListesi.push(...kadrolar)

  const seciliKadroHam =
    !yeniKayit && sicil
      ? ((Number.isFinite(seciliKadroId) && seciliKadroId > 0
          ? kadroListesi.find(k => {
              if (k.id !== seciliKadroId) return false
              if (seciliRol === 'vekil') return (k.vekil ?? '').trim() === sicil
              if (seciliRol === 'asil') return (k.asil ?? '').trim() === sicil
              return true
            })
          : undefined) ?? kadroListesi[0] ?? null)
      : null

  const bosKadrolar = tumBosKadrolar

  const mudurlukler = (mudurlukRes.data ?? []).map(m => m.mudurluk_adi).filter(Boolean)
  const unvanlar = (unvanRes.data ?? []).map(u => ({ id: u.id, ad: u.unvan_adi, sinif: u.sinif_adi })).filter(u => u.ad)

  const { data: baskanKadro } = await supabase
    .from('kadro_hareketleri')
    .select('asil')
    .ilike('kadro_unvani', '%Belediye Başkanı%')
    .is('ayrilis_tarihi', null)
    .limit(1)
    .maybeSingle()
  const { data: yardimciKadrolar } = await supabase
    .from('kadro_hareketleri')
    .select('asil')
    .ilike('kadro_unvani', '%Belediye Başkan Yardımcısı%')
    .is('ayrilis_tarihi', null)

  const baskanSicil = (baskanKadro as { asil?: string } | null)?.asil ?? ''
  const yardimciSiciller = [...new Set((yardimciKadrolar ?? []).map((y: { asil: string | null }) => (y.asil ?? '').trim()).filter(Boolean))]

  const { data: calisanAdlar } = await supabase
    .from('calisan')
    .select('sicil_no, ad_soyad')
    .in('sicil_no', [baskanSicil, ...yardimciSiciller].filter(Boolean))

  const adMap: Record<string, string> = {}
  ;(calisanAdlar ?? []).forEach((c: { sicil_no: string; ad_soyad: string | null }) => {
    adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no
  })

  const ogrenim = (ogrenimRes.data ?? [])[0]
  const ogrenimDurumu = ogrenim?.ogrenim_turu
    ? `${ogrenim.ogrenim_turu}${ogrenim.okul_adi ? ` - ${ogrenim.okul_adi}` : ''}`
    : null

  const ayrilisNedenleri = await yukleGidisAyrilisNedenleri(supabase)

  return {
    personel,
    personeller,
    ogrenimDurumu,
    seciliKadro: seciliKadroHam,
    seciliKadroRol: seciliRol === 'vekil' ? 'vekil' : 'asil',
    bosKadrolar,
    mudurlukler,
    unvanlar,
    onaylayan: adMap[baskanSicil] ?? baskanSicil,
    yardimcilar: yardimciSiciller.map(s => ({ sicil: s, ad: adMap[s] ?? s })),
    terfiSon,
    gostergeler: (gostergeRes.data ?? []) as { derece: number; kademe: number; gosterge: number }[],
    ayrilisNedenleri,
    sonHareketAyrilis: {
      tarih: sonHareketRaw?.ayrilis_tarihi ?? null,
      nedeni: sonHareketRaw?.ayrilis_nedeni ?? null,
    },
  }
}
