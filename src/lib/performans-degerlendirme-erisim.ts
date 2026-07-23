import type { SupabaseClient } from '@supabase/supabase-js'
import {
  performansAmirErisimOlustur,
  type PerformansAmirErisim,
} from '@/lib/performans-amir-erisim'
import type { OrgBirimSatir } from '@/lib/performans-amir'
import { tumAktifKadroHareketleriYukle } from '@/lib/performans-kadro'

type DegAtama = {
  mudurluk_adi?: string | null
  amir1_sicil?: string | null
  amir2_sicil?: string | null
}

async function performansAmirVerisiYukle(supabase: SupabaseClient) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [{ data: aktifOrg }, kadroRaw, { data: degRaw }] = await Promise.all([
    supabase
      .from('tanim_organizasyon')
      .select('id')
      .eq('aktif', true)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle(),
    tumAktifKadroHareketleriYukle<{
      asil?: string | null
      vekil?: string | null
      kadro_unvani?: string | null
      gorev_unvani?: string | null
      kadro_mudurlugu?: string | null
      gorev_mudurlugu?: string | null
      statu?: string | null
      durumu?: string | null
    }>(
      supabase,
      'asil, vekil, kadro_unvani, gorev_unvani, kadro_mudurlugu, gorev_mudurlugu, statu, durumu',
      { durumu: ['Dolu', 'Vekil'] },
    ),
    db
      .from('performans_degerlendirme')
      .select('mudurluk_adi, amir1_sicil, amir2_sicil'),
  ])

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

  return {
    birimler,
    kadroRows: kadroRaw,
    degAtamalari: (degRaw ?? []) as DegAtama[],
  }
}

export async function performansAmirErisimCoz(
  supabase: SupabaseClient,
  sicilNo: string,
): Promise<PerformansAmirErisim> {
  const { birimler, kadroRows, degAtamalari } = await performansAmirVerisiYukle(supabase)
  return performansAmirErisimOlustur(sicilNo, birimler, kadroRows, degAtamalari)
}

export async function performansDegerlendirmeYapabilir(
  supabase: SupabaseClient,
  sicilNo: string,
): Promise<boolean> {
  const erisim = await performansAmirErisimCoz(supabase, sicilNo)
  return erisim.amir1Yetkisi || erisim.amir2Yetkisi
}
