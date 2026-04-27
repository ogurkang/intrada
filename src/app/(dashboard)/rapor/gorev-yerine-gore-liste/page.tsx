import { createClient } from '@/lib/supabase/server'
import GorevYerineGoreListeClient from '@/components/rapor/GorevYerineGoreListeClient'
import { filterOutGodmodeCalisan, filterOutHiddenSystemByEmail } from '@/lib/godmode-calisan'
import { secilenKadroSatirAsil } from '@/lib/kadro-statu-sec'
import { etiketAnahtari } from '@/lib/rapor-statuye-gore-cinsiyet'
import {
  FIRMA_STATU_ETIKET,
  TANIMSIZ_STATU_ETIKET,
  hazirlaStatuSirali,
  karsilastirStatuSonraSicilAd,
} from '@/lib/statu-liste-siralama'
import {
  gorevYerineGoreListeSatirUret,
  mudurlukKonumMetniHaritasi,
  type GorevYerineGoreListeSatir,
  type KadroGenis,
} from '@/lib/rapor-gorev-yerine-gore-liste'

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

const LISTE_ACIKLAMA =
  'Konum: Tanımlar > Müdürlük kaydındaki konum (kadro personelde kadro müdürlüğü; ADABEL personelde görev müdürlüğü ile eşleşir). Cinsiyet: personel kartı. Unvan: kadro hareketlerindeki görev unvanı (ADABEL: görevi alanı). Fiili görev: Görev Bilgileri’ndeki görev yeri doluysa o metin, değilse kadro görev müdürlüğü (ADABEL: görev müdürlüğü).'

export default async function GorevYerineGoreListePage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const D = new Date().toISOString().slice(0, 10)
  const anlikTarihEtiket = new Date().toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  type CalisanRow = {
    sicil_no: string
    ad_soyad: string
    cinsiyet: string | null
    gorev_yeri: string | null
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calisanQuery = (supabase as any)
    .from('calisan')
    .select('sicil_no, ad_soyad, cinsiyet, gorev_yeri')
    .order('ad_soyad')

  const [
    calisanResult,
    { data: phRaw },
    { data: tanimStatuRaw },
    { data: mudTanimRaw },
  ] = await Promise.all([
    calisanQuery as Promise<{ data: CalisanRow[] | null; error: { message: string } | null }>,
    supabase
      .from('personel_hareketleri')
      .select('sicil_no, ayrilis_tarihi')
      .order('yururluk_tarihi', { ascending: false }),
    supabase.from('tanim_statu').select('statu_adi, sira_no').eq('aktif', true),
    supabase.from('tanim_mudurluk').select('mudurluk_adi, konum').eq('aktif', true),
  ])

  const { data: calisanRaw, error } = calisanResult

  const sonAyrilisPerSicil = new Map<string, string | null>()
  for (const r of phRaw ?? []) {
    if (!sonAyrilisPerSicil.has(r.sicil_no)) {
      sonAyrilisPerSicil.set(r.sicil_no, r.ayrilis_tarihi)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calisanFiltreli = filterOutGodmodeCalisan(calisanRaw as any ?? []) as CalisanRow[]
  const aktifSiciller = new Set<string>()
  calisanFiltreli.forEach(c => {
    const sonAyrilis = sonAyrilisPerSicil.get(c.sicil_no)
    if (!sonAyrilis) aktifSiciller.add(c.sicil_no)
  })
  const kadroCalisan = calisanFiltreli.filter(c => aktifSiciller.has(c.sicil_no))

  const { statuSirali, etiketler } = hazirlaStatuSirali(tanimStatuRaw ?? [])
  const mudKonum = mudurlukKonumMetniHaritasi(mudTanimRaw ?? [])

  const sicilList = [...aktifSiciller]
  const kadroByAsil = new Map<string, KadroGenis[]>()
  for (const part of chunk(sicilList, 120)) {
    const { data: kRows } = await supabase
      .from('kadro_hareketleri')
      .select(
        'asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu, kadro_mudurlugu, gorev_mudurlugu, gorev_unvani',
      )
      .in('asil', part)
    for (const r of kRows ?? []) {
      if (!r.asil) continue
      const list = kadroByAsil.get(r.asil) ?? []
      list.push(r as KadroGenis)
      kadroByAsil.set(r.asil, list)
    }
  }

  const kadroSatirlarRaw = kadroCalisan.map(c => {
    const rows = kadroByAsil.get(c.sicil_no) ?? []
    const sec = secilenKadroSatirAsil(rows, D)
    const k = sec ?? bosKadro(c.sicil_no)
    const rawStatu = sec?.statu
    const statuEtiket = etiketAnahtari(etiketler, rawStatu) || TANIMSIZ_STATU_ETIKET
    return {
      kayit_key: `kadro:${c.sicil_no}`,
      kind: 'kadro' as const,
      statuEtiket,
      sicil_no: c.sicil_no,
      ad_soyad: c.ad_soyad,
      cinsiyet: c.cinsiyet,
      gorev_yeri: c.gorev_yeri,
      kadro: k,
    }
  })

  const { data: firmaRaw } = await supabase
    .from('firma_calisanlar')
    .select('id, public_id, sicil_no, ad_soyad, gorev_mudurlugu, gorevi, ayrilis_tarihi, e_posta, cinsiyet')
    .order('ad_soyad')

  const firmaSatirlarRaw = filterOutHiddenSystemByEmail(firmaRaw ?? []).map(f => ({
      kayit_key: `firma:${f.id}`,
      kind: 'firma' as const,
      statuEtiket: FIRMA_STATU_ETIKET,
      sicil_no: f.sicil_no,
      ad_soyad: f.ad_soyad,
      cinsiyet: f.cinsiyet,
      gorev_mudurlugu: f.gorev_mudurlugu,
      gorevi: f.gorevi,
    }))

  const siralı = [...kadroSatirlarRaw, ...firmaSatirlarRaw].sort((a, b) =>
    karsilastirStatuSonraSicilAd(
      {
        statuEtiket: a.statuEtiket,
        sicil_no: a.kind === 'kadro' ? a.sicil_no : a.sicil_no,
        ad_soyad: a.ad_soyad,
      },
      {
        statuEtiket: b.statuEtiket,
        sicil_no: b.kind === 'kadro' ? b.sicil_no : b.sicil_no,
        ad_soyad: b.ad_soyad,
      },
      statuSirali,
    ),
  )

  const satirlar: GorevYerineGoreListeSatir[] = siralı.map(row =>
    gorevYerineGoreListeSatirUret(
      mudKonum,
      row.kind === 'kadro'
        ? {
            kayit_key: row.kayit_key,
            kind: 'kadro',
            sicil_no: row.sicil_no,
            ad_soyad: row.ad_soyad,
            cinsiyet: row.cinsiyet,
            gorev_yeri: row.gorev_yeri,
            statuEtiket: row.statuEtiket,
            kadro: row.kadro,
          }
        : {
            kayit_key: row.kayit_key,
            kind: 'firma',
            sicil_no: row.sicil_no,
            ad_soyad: row.ad_soyad,
            cinsiyet: row.cinsiyet,
            gorev_mudurlugu: row.gorev_mudurlugu,
            gorevi: row.gorevi,
            statuEtiket: row.statuEtiket,
          },
    ),
  )

  const { data: ayarRaw } = await sb
    .from('rapor_gorev_yeri_liste_ayar')
    .select('kayit_key, sira_no')
    .order('sira_no', { ascending: true })

  const satirByKey = new Map(satirlar.map(s => [s.kayit_key, s] as const))
  const seciliKeys = (ayarRaw ?? []).map((a: { kayit_key: string | null }) => String(a.kayit_key ?? '').trim()).filter(Boolean)
  const ayarliSatirlar = seciliKeys.map(k => satirByKey.get(k)).filter((s): s is GorevYerineGoreListeSatir => !!s)
  const seciliSet = new Set(ayarliSatirlar.map(s => s.kayit_key))
  const secilmeyenSatirlar = satirlar.filter(s => !seciliSet.has(s.kayit_key))
  const kayitListesiSatirlari = ayarliSatirlar

  return (
    <div>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          Veri yüklenirken hata: {error.message}
        </div>
      )}

      <GorevYerineGoreListeClient
        satirlar={kayitListesiSatirlari}
        tumSatirlar={satirlar}
        seciliKeyler={ayarliSatirlar.map(s => s.kayit_key)}
        secilmeyenSatirlar={secilmeyenSatirlar}
        anlikTarihEtiket={anlikTarihEtiket}
        aciklama={LISTE_ACIKLAMA}
        excelHref="/api/rapor/gorev-yerine-gore-liste/excel"
      />
    </div>
  )
}
