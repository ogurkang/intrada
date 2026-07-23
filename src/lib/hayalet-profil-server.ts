import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppAccess } from '@/lib/app-access'
import {
  HAYALET_COOKIE,
  hayaletProfilYetkisiVar,
  type HayaletProfilDurum,
} from '@/lib/hayalet-profil'

export async function hayaletCookieOku(): Promise<string | null> {
  const jar = await cookies()
  const v = jar.get(HAYALET_COOKIE)?.value?.trim()
  return v || null
}

export async function hayaletCookieYaz(sicil: string): Promise<void> {
  const jar = await cookies()
  jar.set(HAYALET_COOKIE, sicil.trim(), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  })
}

export async function hayaletCookieSil(): Promise<void> {
  const jar = await cookies()
  jar.delete(HAYALET_COOKIE)
}

export async function hayaletProfilDurumCoz(
  supabase: SupabaseClient,
  access: AppAccess,
): Promise<HayaletProfilDurum | null> {
  const raw = await hayaletCookieOku()
  if (!raw || !hayaletProfilYetkisiVar(access)) {
    if (raw) await hayaletCookieSil()
    return null
  }

  const { data: cal } = await supabase
    .from('calisan')
    .select('ad_soyad')
    .eq('sicil_no', raw)
    .maybeSingle()

  if (!cal) {
    await hayaletCookieSil()
    return null
  }

  return {
    aktif: true,
    hedefSicil: raw,
    hedefAdSoyad: (cal.ad_soyad ?? raw).trim() || raw,
  }
}

export async function hayaletModAktif(access: AppAccess): Promise<boolean> {
  if (!hayaletProfilYetkisiVar(access)) return false
  return Boolean(await hayaletCookieOku())
}
