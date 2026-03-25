'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient, tryCreateServiceRoleClient } from '@/lib/supabase/service-role'
import { createAnonServerClient } from '@/lib/supabase/anon-server'
import { createClient } from '@/lib/supabase/server'
import { calisanBulSifreSifirlaIcin } from '@/lib/calisan-kimlik-dogrula'
import { authUserIdSifreSifirlaIcin } from '@/lib/auth-admin-helpers'
import {
  normalizeKullaniciAdi,
  kullaniciAdiGecerliMi,
  kullaniciAdiHataMetni,
} from '@/lib/kullanici-adi'
import { yeniSifreGecerliMi, yeniSifreHataMetni, yeniSifreNormalize } from '@/lib/sifre-politikasi'

const GENEL_HATA =
  'E-posta, T.C. kimlik numarası ve sicil bilgisi kayıtlarla eşleşmiyor veya hesap bulunamadı.'

function formKimlik(formData: FormData) {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const tckn = String(formData.get('tckn') ?? '')
  const sicil = String(formData.get('sicil') ?? '')
  return { email, tckn, sicil }
}

/** Şifre sıfırlama e-postasındaki bağlantı için tam site kökü (Supabase Redirect URLs’e ekleyin). */
function authRedirectOrigin(): string {
  const u = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '')
  if (u) return u
  const v = process.env.VERCEL_URL?.trim()
  if (v) return v.startsWith('http') ? v : `https://${v}`
  return 'http://localhost:3000'
}

export type DogrulaSifreSifirlaSonuc =
  | { ok: true; yol: 'dogrudan' }
  | { ok: true; yol: 'eposta' }
  | { hata: string }

/**
 * Adım 1: e-posta + TCKN + sicil doğrula.
 * - Service role varsa: anında 2. adıma (yeni şifre formu) geçilir.
 * - Yoksa: Supabase şifre sıfırlama e-postası gönderilir; bağlantı /sifre-sifirla/yenile açar.
 */
export async function dogrulaSifreSifirlaKimlik(formData: FormData): Promise<DogrulaSifreSifirlaSonuc> {
  const { email, tckn, sicil } = formKimlik(formData)
  if (!email) return { hata: 'E-posta girin.' }
  if (!tckn.trim()) return { hata: 'T.C. kimlik numarası girin.' }
  if (!sicil.trim()) return { hata: 'Sicil numarası girin.' }

  const admin = tryCreateServiceRoleClient()
  if (admin) {
    try {
      const calisan = await calisanBulSifreSifirlaIcin(admin, email, tckn, sicil)
      if (!calisan) return { hata: GENEL_HATA }

      const authUserId = await authUserIdSifreSifirlaIcin(admin, calisan.sicil_no, email)
      if (!authUserId) {
        return {
          hata: 'Bu e-posta ile sistemde giriş hesabı bulunamadı. Yöneticinize başvurun.',
        }
      }
      return { ok: true, yol: 'dogrudan' }
    } catch (e) {
      console.error('[dogrulaSifreSifirlaKimlik service]', e)
      return { hata: 'Doğrulama tamamlanamadı. Lütfen tekrar deneyin.' }
    }
  }

  try {
    const anon = createAnonServerClient()
    const { data: rpcOk, error: rpcErr } = await anon.rpc('dogrula_sifre_sifirla_kimlik', {
      p_email: email,
      p_tckn: tckn,
      p_sicil: sicil,
    })

    if (rpcErr) {
      console.error('[dogrula_sifre_sifirla_kimlik rpc]', rpcErr)
      return {
        hata:
          'Kimlik doğrulama şu an kullanılamıyor. Veritabanı güncellemesi (RPC) uygulanmış mı kontrol edin veya yöneticinize başvurun.',
      }
    }
    if (!rpcOk) return { hata: GENEL_HATA }

    const origin = authRedirectOrigin()
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent('/sifre-sifirla/yenile')}`

    const { error: mailErr } = await anon.auth.resetPasswordForEmail(email, { redirectTo })
    if (mailErr) {
      console.error('[resetPasswordForEmail]', mailErr)
      return {
        hata:
          'E-posta gönderilemedi. Supabase’de Redirect URL olarak uygulama adresinizi ekleyin veya yöneticinize başvurun.',
      }
    }

    return { ok: true, yol: 'eposta' }
  } catch (e) {
    console.error('[dogrulaSifreSifirlaKimlik anon]', e)
    return { hata: 'İşlem tamamlanamadı. Bağlantınızı kontrol edip tekrar deneyin.' }
  }
}

/**
 * Adım 2 (yalnızca service role yolu): kimlik + kalıcı kullanıcı adı + yeni şifre.
 */
export async function sifreSifirlaKaydet(formData: FormData): Promise<{ hata?: string }> {
  const { email, tckn, sicil } = formKimlik(formData)
  const kullaniciAdi = normalizeKullaniciAdi(String(formData.get('kullanici_adi') ?? ''))
  const sifre = yeniSifreNormalize(String(formData.get('sifre') ?? ''))
  const sifreTekrar = yeniSifreNormalize(String(formData.get('sifre_tekrar') ?? ''))

  if (!email) return { hata: 'E-posta girin.' }
  if (!tckn.trim()) return { hata: 'T.C. kimlik numarası girin.' }
  if (!sicil.trim()) return { hata: 'Sicil numarası girin.' }
  if (!kullaniciAdiGecerliMi(kullaniciAdi)) return { hata: kullaniciAdiHataMetni() }
  if (!yeniSifreGecerliMi(sifre)) return { hata: yeniSifreHataMetni() }
  if (sifre !== sifreTekrar) return { hata: 'Şifre ile tekrarı eşleşmiyor.' }

  try {
    const admin = createServiceRoleClient()
    const calisan = await calisanBulSifreSifirlaIcin(admin, email, tckn, sicil)
    if (!calisan) return { hata: GENEL_HATA }

    const authUserId = await authUserIdSifreSifirlaIcin(admin, calisan.sicil_no, email)
    if (!authUserId) {
      return {
        hata: 'Bu e-posta ile sistemde giriş hesabı bulunamadı. Yöneticinize başvurun.',
      }
    }

    const { error: updErr } = await admin.auth.admin.updateUserById(authUserId, { password: sifre })
    if (updErr) return { hata: updErr.message }

    const { error: profErr } = await admin
      .from('app_profiles')
      .update({
        kullanici_adi: kullaniciAdi,
        updated_at: new Date().toISOString(),
      })
      .eq('id', authUserId)

    if (profErr) return { hata: profErr.message }

    revalidatePath('/login')
    return {}
  } catch (e) {
    console.error('[sifreSifirlaKaydet]', e)
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('SUPABASE_SERVICE_ROLE_KEY') || msg.includes('NEXT_PUBLIC_SUPABASE_URL')) {
      return {
        hata:
          'Bu yol için sunucuda service role anahtarı gerekir. E-posta ile gelen bağlantıyı kullanın veya yöneticinize başvurun.',
      }
    }
    return { hata: 'Şifre kaydedilemedi. Lütfen tekrar deneyin.' }
  }
}

/**
 * E-posta bağlantısı sonrası: oturum açık kullanıcı için kullanıcı adı + yeni şifre (ilk kurulum kuralları).
 */
export async function kurtarmaKullaniciAdiVeSifreKaydet(formData: FormData): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      hata: 'Oturum bulunamadı veya süresi doldu. Şifre sıfırlama sayfasından yeniden başlayın veya e-postadaki bağlantıyı tekrar açın.',
    }
  }

  const kullaniciAdi = normalizeKullaniciAdi(String(formData.get('kullanici_adi') ?? ''))
  const sifre = yeniSifreNormalize(String(formData.get('sifre') ?? ''))
  const sifreTekrar = yeniSifreNormalize(String(formData.get('sifre_tekrar') ?? ''))

  if (!kullaniciAdiGecerliMi(kullaniciAdi)) return { hata: kullaniciAdiHataMetni() }
  if (!yeniSifreGecerliMi(sifre)) return { hata: yeniSifreHataMetni() }
  if (sifre !== sifreTekrar) return { hata: 'Şifre ile tekrarı eşleşmiyor.' }

  const { error: authErr } = await supabase.auth.updateUser({ password: sifre })
  if (authErr) return { hata: authErr.message }

  const { error: profErr } = await supabase
    .from('app_profiles')
    .update({
      kullanici_adi: kullaniciAdi,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (profErr) return { hata: profErr.message }

  await supabase.auth.signOut()
  revalidatePath('/login')
  return {}
}
