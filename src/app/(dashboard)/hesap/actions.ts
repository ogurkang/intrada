'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  normalizeKullaniciAdi,
  kullaniciAdiGecerliMi,
  kullaniciAdiHataMetni,
} from '@/lib/kullanici-adi'
import { yeniSifreGecerliMi, yeniSifreHataMetni, yeniSifreNormalize } from '@/lib/sifre-politikasi'
import { disDenetciSifreGecerliMi, disDenetciSifreHataMetni } from '@/lib/dis-denetci-sifre'

export async function tamamlaIlkKurulum(formData: FormData): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum bulunamadı. Tekrar giriş yapın.' }

  const kullaniciAdi = normalizeKullaniciAdi(String(formData.get('kullanici_adi') ?? ''))
  const sifre = yeniSifreNormalize(String(formData.get('sifre') ?? ''))
  const sifreTekrar = yeniSifreNormalize(String(formData.get('sifre_tekrar') ?? ''))

  if (!kullaniciAdiGecerliMi(kullaniciAdi)) {
    return { hata: kullaniciAdiHataMetni() }
  }
  if (!yeniSifreGecerliMi(sifre)) return { hata: yeniSifreHataMetni() }
  if (sifre !== sifreTekrar) return { hata: 'Yeni şifre ile tekrarı eşleşmiyor.' }

  const { error: authErr } = await supabase.auth.updateUser({ password: sifre })
  if (authErr) return { hata: authErr.message }

  const { error: upErr } = await supabase
    .from('app_profiles')
    .update({
      kullanici_adi: kullaniciAdi,
      ilk_giris_tamam: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (upErr) return { hata: upErr.message }
  revalidatePath('/', 'layout')
  return {}
}

/** Giriş yapmış kullanıcı: yalnızca yeni şifre (ilk kurulumdaki kurallarla). */
export async function sifreDegistir(formData: FormData): Promise<{ hata?: string; ok?: true }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum bulunamadı. Tekrar giriş yapın.' }

  const sifre = yeniSifreNormalize(String(formData.get('sifre') ?? ''))
  const sifreTekrar = yeniSifreNormalize(String(formData.get('sifre_tekrar') ?? ''))

  const { data: profil } = await supabase.from('app_profiles').select('profil_turu').eq('id', user.id).maybeSingle()
  const disDenetci = profil?.profil_turu === 'dis_denetci'
  if (disDenetci ? !disDenetciSifreGecerliMi(sifre) : !yeniSifreGecerliMi(sifre)) {
    return { hata: disDenetci ? disDenetciSifreHataMetni() : yeniSifreHataMetni() }
  }
  if (sifre !== sifreTekrar) return { hata: 'Yeni şifre ile tekrarı eşleşmiyor.' }

  const { error: authErr } = await supabase.auth.updateUser({ password: sifre })
  if (authErr) return { hata: authErr.message }

  revalidatePath('/', 'layout')
  return { ok: true }
}
