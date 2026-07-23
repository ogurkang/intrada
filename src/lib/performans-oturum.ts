import type { SupabaseClient } from '@supabase/supabase-js'
import { getAppAccess, isAdminLike, type AppAccess } from '@/lib/app-access'
import { hayaletProfilDurumCoz, hayaletCookieOku } from '@/lib/hayalet-profil-server'
import type { HayaletProfilDurum } from '@/lib/hayalet-profil'

export type PerformansOturum = {
  sicil: string | null
  /** Yönetici tam erişimi (seed, vekalet, tüm müdürlükler) */
  adminBypass: boolean
  hayaletAktif: boolean
}

export async function resolvePerformansOturum(
  supabase: SupabaseClient,
  userId: string,
  access?: AppAccess,
  hayaletDurum?: HayaletProfilDurum | null,
): Promise<PerformansOturum> {
  const acc = access ?? (await getAppAccess(supabase, userId))
  const hayalet =
    hayaletDurum !== undefined ? hayaletDurum : await hayaletProfilDurumCoz(supabase, acc)

  if (hayalet?.aktif) {
    return { sicil: hayalet.hedefSicil, adminBypass: false, hayaletAktif: true }
  }

  if (acc.mode === 'kullanici') {
    return { sicil: acc.sicilNo, adminBypass: false, hayaletAktif: false }
  }

  if (isAdminLike(acc)) {
    const { data } = await supabase
      .from('app_profiles')
      .select('sicil_no')
      .eq('id', userId)
      .maybeSingle()
    return {
      sicil: data?.sicil_no ? String(data.sicil_no) : null,
      adminBypass: true,
      hayaletAktif: false,
    }
  }

  return { sicil: null, adminBypass: false, hayaletAktif: false }
}

/** Performans server action'larında sicil çözümü (hayalet öncelikli). */
export async function performansActionSicil(supabase: SupabaseClient): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const hayaletSicil = await hayaletCookieOku()
  if (hayaletSicil) {
    const access = await getAppAccess(supabase, user.id)
    const durum = await hayaletProfilDurumCoz(supabase, access)
    if (durum?.aktif) return durum.hedefSicil
  }

  const access = await getAppAccess(supabase, user.id)
  if (access.mode === 'kullanici') return access.sicilNo
  if (isAdminLike(access)) {
    const { data } = await supabase
      .from('app_profiles')
      .select('sicil_no')
      .eq('id', user.id)
      .maybeSingle()
    return data?.sicil_no ? String(data.sicil_no) : null
  }
  return null
}

export async function performansActionAdminBypass(supabase: SupabaseClient): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false
  const access = await getAppAccess(supabase, user.id)
  if (!(isAdminLike(access))) return false
  return !(await hayaletModAktifMi(supabase, user.id, access))
}

async function hayaletModAktifMi(
  supabase: SupabaseClient,
  userId: string,
  access: AppAccess,
): Promise<boolean> {
  const raw = await hayaletCookieOku()
  if (!raw) return false
  const durum = await hayaletProfilDurumCoz(supabase, access)
  return durum?.aktif === true
}
