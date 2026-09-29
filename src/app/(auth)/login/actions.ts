'use server'

import { createClient } from '@/lib/supabase/server'
import { tryCreateServiceRoleClient } from '@/lib/supabase/service-role'
import { normalizeKullaniciAdi } from '@/lib/kullanici-adi'

const GIRIS_HATA = 'E-posta/kullanıcı adı veya şifre hatalı.'

export type GirisSonuc = { hata?: string; yon?: string }

async function epostaFromKullaniciAdi(kullaniciAdi: string): Promise<string | null> {
  const admin = tryCreateServiceRoleClient()
  if (!admin) return null

  const { data, error } = await admin
    .from('app_profiles')
    .select('id, kullanici_adi')
    .ilike('kullanici_adi', kullaniciAdi)
  if (error || !data) return null

  const eslesen = data.filter(
    (row) => normalizeKullaniciAdi(String(row.kullanici_adi ?? '')) === kullaniciAdi,
  )
  if (eslesen.length !== 1) return null

  const { data: authData, error: authErr } = await admin.auth.admin.getUserById(eslesen[0].id)
  if (authErr) return null
  const email = authData.user?.email?.trim().toLowerCase()
  return email || null
}

/**
 * @ varsa e-posta ile giriş. Yoksa app_profiles.kullanici_adi aranır,
 * bulunan hesabın Auth e-postası ile şifre doğrulanır.
 */
export async function girisYap(kimlik: string, sifre: string): Promise<GirisSonuc> {
  const ham = kimlik.trim()
  if (!ham || !sifre) return { hata: GIRIS_HATA }

  const email = ham.includes('@')
    ? ham.toLowerCase()
    : await epostaFromKullaniciAdi(normalizeKullaniciAdi(ham))
  if (!email) return { hata: GIRIS_HATA }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: sifre })
  if (error || !data.user) return { hata: GIRIS_HATA }

  const { data: profil } = await supabase
    .from('app_profiles')
    .select('profil_turu')
    .eq('id', data.user.id)
    .maybeSingle()

  return { yon: profil?.profil_turu === 'dis_denetci' ? '/denetim' : '/' }
}
