'use server'

import { createClient } from '@/lib/supabase/server'
import { getAppAccess } from '@/lib/app-access'
import {
  hayaletCookieSil,
  hayaletCookieYaz,
} from '@/lib/hayalet-profil-server'
import { hayaletProfilYetkisiVar } from '@/lib/hayalet-profil'
import { performansDegerlendirmeLandingHref } from '@/lib/performans-donem-coz'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function requireHayaletYetki() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, hata: 'Oturum gerekli.' as const }
  const access = await getAppAccess(supabase, user.id)
  if (!hayaletProfilYetkisiVar(access)) {
    return { supabase, hata: 'Hayalet profil yetkiniz yok.' as const }
  }
  return { supabase, hata: null as null, userId: user.id }
}

export async function hayaletProfilBaslat(formData: FormData): Promise<{ hata?: string }> {
  const gate = await requireHayaletYetki()
  if (gate.hata) return { hata: gate.hata }

  const sicil = String(formData.get('sicil_no') ?? '').trim()
  if (!sicil) return { hata: 'Personel seçin.' }

  const { data: cal } = await gate.supabase
    .from('calisan')
    .select('sicil_no')
    .eq('sicil_no', sicil)
    .maybeSingle()
  if (!cal) return { hata: 'Seçilen personel bulunamadı.' }

  await hayaletCookieYaz(sicil)
  revalidatePath('/', 'layout')
  const hedef = await performansDegerlendirmeLandingHref(gate.supabase)
  redirect(hedef)
}

export async function hayaletProfilBitir(): Promise<void> {
  await hayaletCookieSil()
  revalidatePath('/', 'layout')
}
