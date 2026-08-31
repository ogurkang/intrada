import type { SupabaseClient } from '@supabase/supabase-js'
import { isAdminLike, type AppAccess } from '@/lib/app-access'
import { mudurlukIdFromAuthSession } from '@/lib/kadro-mudurluk-id'

export type MudurlukSecenek = { id: number; mudurluk_adi: string }

export async function aktifMudurlukleriGetir(supabase: SupabaseClient): Promise<MudurlukSecenek[]> {
  const { data } = await supabase
    .from('tanim_mudurluk')
    .select('id, mudurluk_adi')
    .eq('aktif', true)
    .order('mudurluk_adi')
  return (data ?? []).map(r => ({ id: r.id, mudurluk_adi: r.mudurluk_adi }))
}

/** Bütçe işlem/rapor ekranları: admin seçili müdürlük, personel kadro müdürlüğü. */
export async function butceIslemMudurlukCoz(
  supabase: SupabaseClient,
  userId: string,
  access: AppAccess,
  seciliMudIdRaw?: string | number | null,
): Promise<{ isAdmin: boolean; mudId: number | null; mudurlukler: MudurlukSecenek[] }> {
  const isAdmin = isAdminLike(access)
  if (isAdmin) {
    const mudurlukler = await aktifMudurlukleriGetir(supabase)
    const parsed = seciliMudIdRaw != null && String(seciliMudIdRaw).trim() !== ''
      ? parseInt(String(seciliMudIdRaw), 10)
      : NaN
    if (Number.isFinite(parsed) && parsed > 0 && mudurlukler.some(m => m.id === parsed)) {
      return { isAdmin: true, mudId: parsed, mudurlukler }
    }
    return { isAdmin: true, mudId: null, mudurlukler }
  }
  const mudId = await mudurlukIdFromAuthSession(supabase, userId, access)
  return { isAdmin: false, mudId, mudurlukler: [] }
}
