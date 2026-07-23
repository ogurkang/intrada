import type { SupabaseClient } from '@supabase/supabase-js'
import {
  performansAmirEsle,
  type AmirEslemeSonucu,
  type OrgBirimSatir,
} from '@/lib/performans-amir'
import {
  mudurlukByNormHaritasi,
  performansPersonelEtkinUnvan,
  performansMudurlukCoz,
  tumAktifKadroHareketleriYukle,
} from '@/lib/performans-kadro'

export type PerformansKadroAmirSatir = {
  durumu?: string | null
  statu?: string | null
  kadro_unvani?: string | null
  gorev_unvani?: string | null
  gorev_mudurlugu?: string | null
  asil?: string | null
  vekil?: string | null
  kadro_mudurlugu?: string | null
}

export type PerformansOrgBaglam = {
  birimler: OrgBirimSatir[]
  kadrolar: PerformansKadroAmirSatir[]
  mudurlukByNorm: Map<string, string>
}

/** Organizasyon + kadro bağlamı (amir eşlemesi için; statü filtresi yok). */
export async function performansOrgBaglamiYukle(
  supabase: SupabaseClient,
): Promise<PerformansOrgBaglam> {
  const { data: aktifOrg } = await supabase
    .from('tanim_organizasyon')
    .select('id')
    .eq('aktif', true)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: birimRaw } = aktifOrg?.id
    ? await supabase
        .from('tanim_organizasyon_birim')
        .select(
          'id, birim_turu, mudurluk_id, personel_sicil_no, ust_birim_id, mudurluk:tanim_mudurluk(id, mudurluk_adi)',
        )
        .eq('organizasyon_id', aktifOrg.id)
    : { data: [] }

  const { data: mudRaw } = await supabase
    .from('tanim_mudurluk')
    .select('mudurluk_adi')
    .eq('aktif', true)
  const mudurlukByNorm = mudurlukByNormHaritasi(
    (mudRaw ?? []).map(m => m.mudurluk_adi).filter(Boolean) as string[],
  )

  const kadroRows = await tumAktifKadroHareketleriYukle<PerformansKadroAmirSatir>(
    supabase,
    'durumu, statu, kadro_unvani, gorev_unvani, gorev_mudurlugu, asil, vekil, kadro_mudurlugu',
    { durumu: ['Dolu', 'Vekil'] },
  )

  return {
    birimler: (birimRaw ?? []) as unknown as OrgBirimSatir[],
    kadrolar: kadroRows,
    mudurlukByNorm,
  }
}

function kadroBySicil(
  sicilNo: string,
  kadrolar: PerformansKadroAmirSatir[],
): PerformansKadroAmirSatir | null {
  for (const r of kadrolar) {
    const asil = String(r.asil ?? '').trim()
    const vekil = String(r.vekil ?? '').trim()
    if (asil === sicilNo.trim() || vekil === sicilNo.trim()) return r
  }
  return null
}

/** DB yerine organizasyon ağacından güncel 1./2. amir sicillerini çözer. */
export function performansDegerlendirmeAmirCanli(
  deg: { sicil_no: string; mudurluk_adi?: string | null },
  baglam: PerformansOrgBaglam,
): AmirEslemeSonucu {
  const mudurlukAdi =
    deg.mudurluk_adi?.trim() ||
    (() => {
      const kadro = kadroBySicil(deg.sicil_no, baglam.kadrolar)
      return kadro ? performansMudurlukCoz(kadro, baglam.mudurlukByNorm) : null
    })()

  const unvan = performansPersonelEtkinUnvan(
    deg.sicil_no,
    mudurlukAdi,
    baglam.kadrolar,
    baglam.mudurlukByNorm,
  )

  return performansAmirEsle({
    sicilNo: deg.sicil_no,
    unvan,
    mudurlukAdi,
    birimler: baglam.birimler,
    kadroRows: baglam.kadrolar,
  })
}

export function performansDegerlendirmeErisimVar(
  currentSicil: string,
  deg: { sicil_no: string; mudurluk_adi?: string | null },
  baglam: PerformansOrgBaglam,
): boolean {
  const sn = currentSicil.trim()
  if (!sn) return false
  if (deg.sicil_no === sn) return true
  const canli = performansDegerlendirmeAmirCanli(deg, baglam)
  if (canli.amir1_sicil === sn) return true
  if (!canli.tek_amir && canli.amir2_sicil === sn) return true
  return false
}
