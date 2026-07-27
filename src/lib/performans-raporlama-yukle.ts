import type { SupabaseClient } from '@supabase/supabase-js'
import { performansAmirEsle, type OrgBirimSatir } from '@/lib/performans-amir'
import {
  performansEk2Bant,
  performansEk2DusukMu,
  performansEk3TamamlanmisMi,
  type PerformansEk2Satir,
  type PerformansEk3Satir,
} from '@/lib/performans-ek3-rapor'
import {
  performansRaporlamaErisimiVar,
  performansRaporlamaSatirlariSec,
} from '@/lib/performans-raporlama-erisim'
import {
  kadroMudurlukIndeksi,
  mudurlukByNormHaritasi,
  performansEtkinUnvanHaritasi,
  performansKadroSatirSec,
  performansKadroUygun,
  performansMudurlukCoz,
  performansPersonelEtkinUnvan,
  tumAktifKadroHareketleriYukle,
} from '@/lib/performans-kadro'
import type { PerformansKadroAmirSatir } from '@/lib/performans-degerlendirme-amir-canli'

type DegRow = {
  id: number
  sicil_no: string
  mudurluk_adi: string | null
  durum: string
  tek_amir: boolean
  puan_amir1: number | null
  puan_amir2: number | null
  ortalama: number | null
  amir1_sicil: string | null
  amir2_sicil: string | null
}

export type PerformansRaporlamaVeri = {
  donem: { id: number; yil: number; sira_no: string | null; durum: string }
  ek3FlatListe: PerformansEk3Satir[]
  mudurlukler: string[]
  ek2Satirlar: PerformansEk2Satir[]
  erisimVar: boolean
}

export type PerformansRaporlamaKapsam = {
  currentSicil: string | null
  adminBypass: boolean
}

async function adHaritasi(
  supabase: SupabaseClient,
  siciller: string[],
): Promise<Record<string, string>> {
  const map: Record<string, string> = {}
  if (siciller.length === 0) return map
  const { data } = await supabase.from('calisan').select('sicil_no, ad_soyad').in('sicil_no', siciller)
  ;(data ?? []).forEach(c => {
    if (c.sicil_no) map[c.sicil_no] = c.ad_soyad ?? c.sicil_no
  })
  return map
}

function ek3SatirOlustur(
  d: DegRow,
  sira: number,
  adMap: Record<string, string>,
  unvan: string | null,
  kadro: PerformansKadroAmirSatir | null,
): PerformansEk3Satir {
  return {
    sira,
    degerlendirme_id: d.id,
    sicil_no: d.sicil_no,
    ad_soyad: adMap[d.sicil_no] ?? d.sicil_no,
    unvan: unvan ?? kadro?.kadro_unvani ?? kadro?.gorev_unvani ?? null,
    mudurluk_adi: d.mudurluk_adi,
    puan_amir1: d.puan_amir1,
    puan_amir2: d.puan_amir2,
    ortalama: d.ortalama,
    amir1_sicil: d.amir1_sicil,
    amir2_sicil: d.amir2_sicil,
    amir1_ad: d.amir1_sicil ? (adMap[d.amir1_sicil] ?? d.amir1_sicil) : null,
    amir2_ad: d.amir2_sicil ? (adMap[d.amir2_sicil] ?? d.amir2_sicil) : null,
  }
}

/** Seçili dönem için Ek-3 cetveli ve Ek-2 düşük performans listesi */
export async function performansRaporlamaVeriYukle(
  supabase: SupabaseClient,
  donemId: number,
  kapsam?: PerformansRaporlamaKapsam,
): Promise<{ hata?: string; veri?: PerformansRaporlamaVeri }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const adminBypass = kapsam?.adminBypass ?? true
  const currentSicil = kapsam?.currentSicil ?? null

  const { data: donem } = await db
    .from('performans_donem')
    .select('id, yil, sira_no, durum')
    .eq('id', donemId)
    .maybeSingle()
  if (!donem) return { hata: 'Dönem bulunamadı.' }

  const { data: degRows, error } = await db
    .from('performans_degerlendirme')
    .select(
      'id, sicil_no, mudurluk_adi, durum, tek_amir, puan_amir1, puan_amir2, ortalama, amir1_sicil, amir2_sicil',
    )
    .eq('donem_id', donemId)
    .not('ortalama', 'is', null)
    .order('mudurluk_adi', { ascending: true })
    .order('sicil_no', { ascending: true })

  if (error) return { hata: error.message }

  let tamamlanan = ((degRows ?? []) as DegRow[]).filter(d => performansEk3TamamlanmisMi(d.durum))

  const [{ data: mudRaw }, kadroRaw, { data: aktifOrg }] = await Promise.all([
    supabase.from('tanim_mudurluk').select('mudurluk_adi').eq('aktif', true),
    tumAktifKadroHareketleriYukle<{
      asil?: string | null
      vekil?: string | null
      kadro_unvani?: string | null
      gorev_unvani?: string | null
      gorev_mudurlugu?: string | null
      kadro_mudurlugu?: string | null
      statu?: string | null
      durumu?: string | null
    }>(
      supabase,
      'asil, vekil, kadro_unvani, gorev_unvani, gorev_mudurlugu, kadro_mudurlugu, statu, durumu',
    ),
    supabase
      .from('tanim_organizasyon')
      .select('id')
      .eq('aktif', true)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const mudurlukByNorm = mudurlukByNormHaritasi(
    (mudRaw ?? []).map(m => m.mudurluk_adi).filter(Boolean) as string[],
  )
  const kadroUygun = kadroRaw.filter(k => performansKadroUygun(k))
  const etkinUnvanMap = performansEtkinUnvanHaritasi(kadroRaw, mudurlukByNorm)

  let birimler: OrgBirimSatir[] = []
  if (aktifOrg?.id) {
    const { data: birimRaw } = await db
      .from('tanim_organizasyon_birim')
      .select(
        'id, birim_turu, mudurluk_id, personel_sicil_no, ust_birim_id, mudurluk:tanim_mudurluk(id, mudurluk_adi)',
      )
      .eq('organizasyon_id', aktifOrg.id)
    birimler = (birimRaw ?? []) as OrgBirimSatir[]
  }

  if (birimler.length > 0) {
    tamamlanan = tamamlanan.map(r => {
      const unvan = etkinUnvanMap.get(r.sicil_no)
      const esleme = performansAmirEsle({
        sicilNo: r.sicil_no,
        unvan,
        mudurlukAdi: r.mudurluk_adi,
        birimler,
        kadroRows: kadroRaw,
      })
      return {
        ...r,
        amir1_sicil: esleme.amir1_sicil,
        amir2_sicil: esleme.tek_amir ? null : esleme.amir2_sicil,
        tek_amir: esleme.tek_amir,
      }
    })
  }

  const kadroIndeks = kadroMudurlukIndeksi(kadroUygun, mudurlukByNorm)
  for (const r of tamamlanan) {
    if (!r.mudurluk_adi) {
      const k = kadroIndeks.get(r.sicil_no)
      if (k) r.mudurluk_adi = performansMudurlukCoz(k, mudurlukByNorm)
    }
  }

  const { data: tumDegAtamalari } = await db
    .from('performans_degerlendirme')
    .select('mudurluk_adi, amir1_sicil, amir2_sicil')
    .eq('donem_id', donemId)

  let erisimVar = adminBypass
  let gorulebilir = tamamlanan

  if (!adminBypass && currentSicil) {
    const { satirlar, erisim } = performansRaporlamaSatirlariSec(
      currentSicil,
      birimler,
      kadroRaw,
      etkinUnvanMap,
      tamamlanan.map(r => ({
        ...r,
        kadro_mudurlugu: kadroIndeks.get(r.sicil_no)?.kadro_mudurlugu ?? null,
      })),
      (tumDegAtamalari ?? []) as Array<{
        mudurluk_adi?: string | null
        amir1_sicil?: string | null
        amir2_sicil?: string | null
      }>,
      false,
    )
    gorulebilir = satirlar
    erisimVar = performansRaporlamaErisimiVar(erisim, false)
  }

  if (gorulebilir.length === 0) {
    return {
      veri: {
        donem,
        ek3FlatListe: [],
        mudurlukler: [],
        ek2Satirlar: [],
        erisimVar,
      },
    }
  }

  const personelSiciller = [...new Set(gorulebilir.map(d => d.sicil_no))]
  const amirSiciller = [
    ...new Set(
      gorulebilir.flatMap(d => [d.amir1_sicil, d.amir2_sicil].filter(Boolean) as string[]),
    ),
  ]
  const tumSiciller = [...new Set([...personelSiciller, ...amirSiciller])]

  const [adMap, calRows, kadroRows] = await Promise.all([
    adHaritasi(supabase, tumSiciller),
    supabase.from('calisan').select('sicil_no, tckn').in('sicil_no', personelSiciller),
    supabase
      .from('kadro_hareketleri')
      .select(
        'asil, vekil, kadro_unvani, gorev_unvani, gorev_mudurlugu, kadro_mudurlugu, statu, durumu',
      )
      .is('ayrilis_tarihi', null)
      .or(personelSiciller.map(s => `asil.eq.${s},vekil.eq.${s}`).join(',')),
  ])

  const tcknMap: Record<string, string | null> = {}
  ;(calRows.data ?? []).forEach(c => {
    if (c.sicil_no) tcknMap[c.sicil_no] = c.tckn ?? null
  })

  const ek2Satirlar: PerformansEk2Satir[] = []

  for (const d of gorulebilir) {
    const kadro = performansKadroSatirSec(
      d.sicil_no,
      (kadroRows.data ?? []) as PerformansKadroAmirSatir[],
    )
    const unvan = performansPersonelEtkinUnvan(
      d.sicil_no,
      d.mudurluk_adi,
      (kadroRows.data ?? []) as PerformansKadroAmirSatir[],
      mudurlukByNorm,
    )
    const adSoyad = adMap[d.sicil_no] ?? d.sicil_no
    const amir1Ad = d.amir1_sicil ? (adMap[d.amir1_sicil] ?? d.amir1_sicil) : null
    const amir2Ad = d.amir2_sicil ? (adMap[d.amir2_sicil] ?? d.amir2_sicil) : null

    if (performansEk2DusukMu(d.ortalama)) {
      const bant = performansEk2Bant(d.ortalama)
      if (bant) {
        ek2Satirlar.push({
          degerlendirme_id: d.id,
          sicil_no: d.sicil_no,
          ad_soyad: adSoyad,
          tckn: tcknMap[d.sicil_no] ?? null,
          gorev: unvan ?? kadro?.gorev_unvani ?? kadro?.kadro_unvani ?? null,
          statu: kadro?.statu ?? null,
          mudurluk_adi: d.mudurluk_adi,
          ortalama: d.ortalama,
          bant,
          amir1_ad: amir1Ad,
          amir2_ad: amir2Ad,
        })
      }
    }
  }

  ek2Satirlar.sort((a, b) => (a.ortalama ?? 0) - (b.ortalama ?? 0))

  const ek3FlatListe = [...gorulebilir]
    .sort((a, b) => {
      const ma = (a.mudurluk_adi ?? '').localeCompare(b.mudurluk_adi ?? '', 'tr')
      if (ma !== 0) return ma
      return a.sicil_no.localeCompare(b.sicil_no, 'tr', { numeric: true })
    })
    .map((d, i) => {
      const kadro = performansKadroSatirSec(
        d.sicil_no,
        (kadroRows.data ?? []) as PerformansKadroAmirSatir[],
      )
      const unvan = performansPersonelEtkinUnvan(
        d.sicil_no,
        d.mudurluk_adi,
        (kadroRows.data ?? []) as PerformansKadroAmirSatir[],
        mudurlukByNorm,
      )
      return ek3SatirOlustur(d, i + 1, adMap, unvan, kadro)
    })

  const mudurlukler = [
    ...new Set(
      ek3FlatListe.map(s => (s.mudurluk_adi ?? '').trim()).filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, 'tr'))

  return {
    veri: {
      donem,
      ek3FlatListe,
      mudurlukler,
      ek2Satirlar,
      erisimVar,
    },
  }
}

export type PerformansDonemOzet = {
  id: number
  yil: number
  sira_no: string | null
  durum: string
  etiket: string
}

export async function performansDonemListesiYukle(
  supabase: SupabaseClient,
): Promise<PerformansDonemOzet[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('performans_donem')
    .select('id, yil, sira_no, durum')
    .order('yil', { ascending: false })
    .order('sira_no', { ascending: false, nullsFirst: false })

  return ((data ?? []) as PerformansDonemOzet[]).map(d => ({
    ...d,
    etiket: d.sira_no ? `${d.yil} / ${d.sira_no}` : String(d.yil),
  }))
}
