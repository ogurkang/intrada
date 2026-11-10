/**
 * Dashboard kabuğu (layout) için kısa ömürlü önbellek.
 * Her sayfa geçişinde profil/yetki/menü ağaçlarının sıfırdan çekilmesini önler.
 * Oturum doğrulaması (auth.getUser) her istekte kalır; ağır DB okumaları önbellekten gelir.
 */
import { unstable_cache } from 'next/cache'
import type { User } from '@supabase/supabase-js'
import { getAppAccess, isAdminLike, type AppAccess } from '@/lib/app-access'
import type { AppProfileEnsure } from '@/lib/app-profile-ensure'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export type DashboardUserShell = {
  profil: AppProfileEnsure | null
  access: AppAccess
  kullaniciKarsilamaAd: string | null
}

const SELECT_PROFIL_TAM = 'id, sicil_no, ilk_giris_tamam, profil_turu, ad_soyad'
const SELECT_PROFIL_ESKI = 'id, sicil_no, ilk_giris_tamam'

function profilNormalize(row: {
  id: string
  sicil_no: string | null
  ilk_giris_tamam: boolean
  profil_turu?: string | null
  ad_soyad?: string | null
}): AppProfileEnsure {
  return {
    id: row.id,
    sicil_no: row.sicil_no,
    ilk_giris_tamam: row.ilk_giris_tamam,
    profil_turu: row.profil_turu ?? 'personel',
    ad_soyad: row.ad_soyad ?? null,
  }
}

async function fetchUserShell(userId: string): Promise<DashboardUserShell> {
  const supabase = createServiceRoleClient()

  let profil: AppProfileEnsure | null = null
  const tam = await supabase
    .from('app_profiles')
    .select(SELECT_PROFIL_TAM)
    .eq('id', userId)
    .maybeSingle()
  if (!tam.error && tam.data) {
    profil = profilNormalize(tam.data)
  } else if (tam.error) {
    const eski = await supabase
      .from('app_profiles')
      .select(SELECT_PROFIL_ESKI)
      .eq('id', userId)
      .maybeSingle()
    if (!eski.error && eski.data) profil = profilNormalize(eski.data)
  }

  const access = await getAppAccess(supabase, userId)

  let kullaniciKarsilamaAd: string | null = null
  if (access.mode === 'dis_denetci') {
    kullaniciKarsilamaAd = (access.adSoyad || profil?.ad_soyad || '').trim() || null
  } else if (access.mode === 'kullanici') {
    const sn = access.sicilNo.trim()
    if (sn) {
      const { data: cal } = await supabase.from('calisan').select('ad_soyad').eq('sicil_no', sn).maybeSingle()
      kullaniciKarsilamaAd = (cal?.ad_soyad ?? '').trim() || null
    }
  }

  return { profil, access, kullaniciKarsilamaAd }
}

/** Kullanıcı kabuğu: ~90 sn. Yetki iptali en geç bu süre sonra yansır. */
export async function loadDashboardUserShell(user: User): Promise<DashboardUserShell> {
  return unstable_cache(
    async () => fetchUserShell(user.id),
    ['dashboard-user-shell', user.id],
    { revalidate: 90, tags: [`dashboard-user-${user.id}`] },
  )()
}

export async function loadPerformansDegerlendirmeHrefCached(
  access: AppAccess,
  hayaletAktif: boolean,
): Promise<string> {
  if (!hayaletAktif && isAdminLike(access)) {
    return '/performans/degerlendirme'
  }
  const yil = new Date().getFullYear()
  return unstable_cache(
    async () => {
      const supabase = createServiceRoleClient()
      const { performansDegerlendirmeLandingHref } = await import('@/lib/performans-donem-coz')
      return performansDegerlendirmeLandingHref(supabase, yil)
    },
    ['performans-degerlendirme-href', String(yil)],
    { revalidate: 600, tags: ['performans-donem'] },
  )()
}
