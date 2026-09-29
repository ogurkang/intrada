'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  normalizeKullaniciAdi,
  kullaniciAdiGecerliMi,
  kullaniciAdiHataMetni,
  KULLANICI_ADI_DUYURU_ANAHTAR,
  KULLANICI_ADI_DUYURU_GORULDU,
  KULLANICI_ADI_KULLANIMDA_METNI,
} from '@/lib/kullanici-adi'
import { yeniSifreGecerliMi, yeniSifreHataMetni, yeniSifreNormalize } from '@/lib/sifre-politikasi'
import { disDenetciSifreGecerliMi, disDenetciSifreHataMetni } from '@/lib/dis-denetci-sifre'
import { kullaniciAdiCakismaKontrol } from '@/lib/kullanici-adi-tekil'
import type { Json } from '@/types/database'

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
  const cakisma = await kullaniciAdiCakismaKontrol(kullaniciAdi, user.id)
  if (cakisma) return { hata: cakisma }
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

  if (upErr) return { hata: upErr.code === '23505' ? KULLANICI_ADI_KULLANIMDA_METNI : upErr.message }
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

function kurtarmaHashNesnesi(raw: unknown): Record<string, Json> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return { ...(raw as Record<string, Json>) }
}

/** Girişteki kullanıcı adı duyurusunu bir kez kapatır. */
export async function kullaniciAdiDuyurusunuKapat(): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum bulunamadı. Tekrar giriş yapın.' }

  const { data, error: selErr } = await supabase
    .from('app_profiles')
    .select('kurtarma_hash')
    .eq('id', user.id)
    .maybeSingle()
  if (selErr) return { hata: 'Bildirim kapatılamadı. Lütfen tekrar deneyin.' }

  const hash = kurtarmaHashNesnesi(data?.kurtarma_hash)
  delete hash[KULLANICI_ADI_DUYURU_ANAHTAR]
  hash[KULLANICI_ADI_DUYURU_GORULDU] = true

  const { error } = await supabase
    .from('app_profiles')
    .update({
      kurtarma_hash: hash,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)
  if (error) return { hata: 'Bildirim kapatılamadı. Lütfen tekrar deneyin.' }
  return {}
}
