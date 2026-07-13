import type { SupabaseClient } from '@supabase/supabase-js'

export interface HizmetBirlestirmePersonel {
  sicil_no: string
  ad_soyad: string
  tckn: string | null
}

/** Aktif kadrosu olan personel listesi (admin seçim). */
export async function listHizmetBirlestirmePersonel(
  supabase: SupabaseClient,
): Promise<HizmetBirlestirmePersonel[]> {
  const { data: khRows } = await supabase
    .from('kadro_hareketleri')
    .select('asil, vekil')
    .is('ayrilis_tarihi', null)

  const sicilSet = new Set<string>()
  for (const kh of khRows ?? []) {
    for (const sic of [kh.asil, kh.vekil]) {
      const s = String(sic ?? '').trim()
      if (s) sicilSet.add(s)
    }
  }

  const siciller = [...sicilSet]
  if (siciller.length === 0) return []

  const { data: calisanlar } = await supabase
    .from('calisan')
    .select('sicil_no, ad_soyad, tckn')
    .in('sicil_no', siciller)

  return (calisanlar ?? [])
    .map(c => ({
      sicil_no: c.sicil_no,
      ad_soyad: c.ad_soyad ?? c.sicil_no,
      tckn: c.tckn ?? null,
    }))
    .sort((a, b) => a.ad_soyad.localeCompare(b.ad_soyad, 'tr'))
}

/** Tek personel (kullanıcı kendi formu / düzenleme). */
export async function getHizmetBirlestirmePersonel(
  supabase: SupabaseClient,
  sicil_no: string,
): Promise<HizmetBirlestirmePersonel | null> {
  const sicil = String(sicil_no ?? '').trim()
  if (!sicil) return null

  const { data: calisan } = await supabase
    .from('calisan')
    .select('sicil_no, ad_soyad, tckn')
    .eq('sicil_no', sicil)
    .maybeSingle()

  if (!calisan) return null

  return {
    sicil_no: calisan.sicil_no,
    ad_soyad: calisan.ad_soyad ?? calisan.sicil_no,
    tckn: calisan.tckn ?? null,
  }
}
