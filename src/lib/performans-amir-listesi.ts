import type { SupabaseClient } from '@supabase/supabase-js'
import {
  mudurlukByNormHaritasi,
  performansPersonelEtkinUnvan,
} from '@/lib/performans-kadro'
import type { PerformansKadroAmirSatir } from '@/lib/performans-degerlendirme-amir-canli'
import { performansAmirImzaHaritasi } from '@/lib/performans-amir-imza'
import type { PerformansAmirImzaSatir } from '@/components/performans/PerformansImzalarClient'

/** Değerlendirme kayıtlarındaki benzersiz 1./2. amir listesi */
export async function performansAmirListesiYukle(
  supabase: SupabaseClient,
): Promise<PerformansAmirImzaSatir[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: degRows } = await (supabase as any)
    .from('performans_degerlendirme')
    .select('amir1_sicil, amir2_sicil')

  const rolMap = new Map<string, Set<'1. amir' | '2. amir'>>()
  for (const r of degRows ?? []) {
    if (r.amir1_sicil) {
      if (!rolMap.has(r.amir1_sicil)) rolMap.set(r.amir1_sicil, new Set())
      rolMap.get(r.amir1_sicil)!.add('1. amir')
    }
    if (r.amir2_sicil) {
      if (!rolMap.has(r.amir2_sicil)) rolMap.set(r.amir2_sicil, new Set())
      rolMap.get(r.amir2_sicil)!.add('2. amir')
    }
  }

  const siciller = [...rolMap.keys()]
  if (siciller.length === 0) return []

  const [adRes, kadroRes, mudRaw, imzaMap] = await Promise.all([
    supabase.from('calisan').select('sicil_no, ad_soyad').in('sicil_no', siciller),
    supabase
      .from('kadro_hareketleri')
      .select('asil, vekil, kadro_unvani, gorev_unvani, gorev_mudurlugu, kadro_mudurlugu, statu, durumu')
      .is('ayrilis_tarihi', null)
      .or(siciller.map(s => `asil.eq.${s},vekil.eq.${s}`).join(',')),
    supabase.from('tanim_mudurluk').select('mudurluk_adi').eq('aktif', true),
    performansAmirImzaHaritasi(supabase, siciller),
  ])

  const mudurlukByNorm = mudurlukByNormHaritasi(
    (mudRaw.data ?? []).map(m => m.mudurluk_adi).filter(Boolean) as string[],
  )

  const adMap: Record<string, string> = {}
  ;(adRes.data ?? []).forEach(c => {
    if (c.sicil_no) adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no
  })

  return siciller
    .map(sicil => {
      const unvan = performansPersonelEtkinUnvan(
        sicil,
        null,
        (kadroRes.data ?? []) as PerformansKadroAmirSatir[],
        mudurlukByNorm,
      )
      const imza = imzaMap[sicil]
      return {
        sicil_no: sicil,
        ad_soyad: adMap[sicil] ?? sicil,
        unvan,
        roller: [...(rolMap.get(sicil) ?? [])].sort(),
        imza_url: imza?.imza_url ?? null,
        dosya_adi: imza?.dosya_adi ?? null,
        updated_at: imza?.updated_at ?? null,
      }
    })
    .sort((a, b) => a.ad_soyad.localeCompare(b.ad_soyad, 'tr'))
}
