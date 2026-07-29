import type { SupabaseClient } from '@supabase/supabase-js'
import { filterOutGodmodeCalisan, filterOutHiddenSystemByEmail } from '@/lib/godmode-calisan'
import { secilenKadroSatirAsil } from '@/lib/kadro-statu-sec'
import { etiketAnahtari } from '@/lib/rapor-statuye-gore-cinsiyet'
import {
  buildPersonelKonumCtx,
  fetchSirketYerleskeTanimSatirlari,
} from '@/lib/personel-gorev-konum'
import {
  gorevYerineGoreListeSatirUret,
  gorevYerineGoreListeUnvanSec,
  type GorevYerineGoreListeSatir,
  type KadroGenis,
} from '@/lib/rapor-gorev-yerine-gore-liste'
import {
  FIRMA_STATU_ETIKET,
  TANIMSIZ_STATU_ETIKET,
  hazirlaStatuSirali,
  karsilastirStatuSonraSicilAd,
} from '@/lib/statu-liste-siralama'
import { fetchMudurlukYerleskeTanimSatirlari } from '@/lib/yerleske-adresi'

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function kadroSicileEkle(map: Map<string, KadroGenis[]>, sicil: string | null | undefined, row: KadroGenis) {
  const s = String(sicil ?? '').trim()
  if (!s) return
  const list = map.get(s) ?? []
  list.push(row)
  map.set(s, list)
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

type CalisanRow = {
  sicil_no: string
  ad_soyad: string
  cinsiyet: string | null
  gorev_yeri: string | null
  gorev_turu: string | null
  yerleske_adresi_id: number | null
}

export type GorevYerineGoreListeYukleSonuc = {
  satirlar: GorevYerineGoreListeSatir[]
  hata?: string
}

/** Aktif personel satırlarını güncel kadro / firma verilerinden üretir. */
export async function gorevYerineGoreListeSatirlariYukle(
  supabase: SupabaseClient,
): Promise<GorevYerineGoreListeYukleSonuc> {
  const D = new Date().toISOString().slice(0, 10)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calisanQuery = (supabase as any)
    .from('calisan')
    .select('sicil_no, ad_soyad, cinsiyet, gorev_yeri, gorev_turu, yerleske_adresi_id')
    .order('ad_soyad')

  const [
    calisanResult,
    { data: phRaw },
    { data: tanimStatuRaw },
    mudSatirlar,
    sirketSatirlar,
  ] = await Promise.all([
    calisanQuery as Promise<{ data: CalisanRow[] | null; error: { message: string } | null }>,
    supabase
      .from('personel_hareketleri')
      .select('sicil_no, ayrilis_tarihi')
      .order('yururluk_tarihi', { ascending: false }),
    supabase.from('tanim_statu').select('statu_adi, sira_no').eq('aktif', true),
    fetchMudurlukYerleskeTanimSatirlari(supabase),
    fetchSirketYerleskeTanimSatirlari(supabase),
  ])

  const { data: calisanRaw, error } = calisanResult
  if (error) return { satirlar: [], hata: error.message }

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
    if (!sonAyrilis || sonAyrilis > D) aktifSiciller.add(c.sicil_no)
  })
  const kadroCalisan = calisanFiltreli.filter(c => aktifSiciller.has(c.sicil_no))

  const { statuSirali, etiketler } = hazirlaStatuSirali(tanimStatuRaw ?? [])
  const konumCtx = buildPersonelKonumCtx(mudSatirlar, sirketSatirlar)
  const yerleskeBySicil = new Map(kadroCalisan.map(c => [c.sicil_no, c.yerleske_adresi_id ?? null]))

  const sicilList = [...aktifSiciller]
  const kadroBySicil = new Map<string, KadroGenis[]>()
  for (const part of chunk(sicilList, 80)) {
    const { data: kRows } = await supabase
      .from('kadro_hareketleri')
      .select(
        'asil, vekil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu, kadro_mudurlugu, gorev_mudurlugu, gorev_unvani, kadro_unvani',
      )
      .or(part.map(s => `asil.eq.${s},vekil.eq.${s}`).join(','))
    for (const r of kRows ?? []) {
      const row = r as KadroGenis
      kadroSicileEkle(kadroBySicil, r.asil, row)
      kadroSicileEkle(kadroBySicil, r.vekil, row)
    }
  }

  const kadroSatirlarRaw = kadroCalisan.map(c => {
    const rows = kadroBySicil.get(c.sicil_no) ?? []
    const sec = secilenKadroSatirAsil(rows, D)
    const kBase = sec ?? bosKadro(c.sicil_no)
    const gorevUnvani = gorevYerineGoreListeUnvanSec(rows, kBase.gorev_unvani)
    const k: KadroGenis = { ...kBase, gorev_unvani: gorevUnvani !== '—' ? gorevUnvani : kBase.gorev_unvani }
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
    .select(
      'id, public_id, sicil_no, ad_soyad, gorev_mudurlugu, gorevi, ayrilis_tarihi, e_posta, cinsiyet, yerleske_adresi_id',
    )
    .order('ad_soyad')

  const firmaSatirlarRaw = filterOutHiddenSystemByEmail(firmaRaw ?? [])
    .filter(f => {
      const ayr = String(f.ayrilis_tarihi ?? '').slice(0, 10)
      return !ayr || ayr > D
    })
    .map(f => ({
      kayit_key: `firma:${f.id}`,
      kind: 'firma' as const,
      statuEtiket: FIRMA_STATU_ETIKET,
      sicil_no: f.sicil_no,
      ad_soyad: f.ad_soyad,
      cinsiyet: f.cinsiyet,
      gorev_mudurlugu: f.gorev_mudurlugu,
      gorevi: f.gorevi,
      yerleske_adresi_id: (f as { yerleske_adresi_id?: number | null }).yerleske_adresi_id ?? null,
    }))

  const siralı = [...kadroSatirlarRaw, ...firmaSatirlarRaw].sort((a, b) =>
    karsilastirStatuSonraSicilAd(
      {
        statuEtiket: a.statuEtiket,
        sicil_no: a.sicil_no,
        ad_soyad: a.ad_soyad,
      },
      {
        statuEtiket: b.statuEtiket,
        sicil_no: b.sicil_no,
        ad_soyad: b.ad_soyad,
      },
      statuSirali,
    ),
  )

  const gorevTuruBySicil = new Map<string, string>()
  for (const c of kadroCalisan) {
    if (c.gorev_turu) gorevTuruBySicil.set(c.sicil_no, c.gorev_turu)
  }

  const satirlar: GorevYerineGoreListeSatir[] = siralı.map(row => {
    const s = gorevYerineGoreListeSatirUret(
      konumCtx,
      row.kind === 'kadro'
        ? {
            kayit_key: row.kayit_key,
            kind: 'kadro',
            sicil_no: row.sicil_no,
            ad_soyad: row.ad_soyad,
            cinsiyet: row.cinsiyet,
            gorev_yeri: row.gorev_yeri,
            yerleske_adresi_id: yerleskeBySicil.get(row.sicil_no) ?? null,
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
            yerleske_adresi_id: row.yerleske_adresi_id,
            statuEtiket: row.statuEtiket,
          },
    )
    if (row.kind === 'kadro' && gorevTuruBySicil.get(row.sicil_no) === 'Kurum Görevlendirme') {
      s.konum = 'Dış'
    }
    return s
  })

  return { satirlar }
}
