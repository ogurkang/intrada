'use server'

import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { calisanBulSifreSifirlaIcin } from '@/lib/calisan-kimlik-dogrula'
import { authUserIdSifreSifirlaIcin } from '@/lib/auth-admin-helpers'
import { yeniSifreGecerliMi, yeniSifreHataMetni, yeniSifreNormalize } from '@/lib/sifre-politikasi'
import { revalidatePath } from 'next/cache'

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

/** Adım 1: e-posta + TCKN + sicil doğrula (şifre alanı yok). */
export async function dogrulaSifreSifirlaKimlik(
  formData: FormData,
): Promise<{ ok?: true; hata?: string }> {
  const { email, tckn, sicil } = formKimlik(formData)
  if (!email) return { hata: 'E-posta girin.' }
  if (!tckn.trim()) return { hata: 'T.C. kimlik numarası girin.' }
  if (!sicil.trim()) return { hata: 'Sicil numarası girin.' }

  const admin = createServiceRoleClient()
  const calisan = await calisanBulSifreSifirlaIcin(admin, email, tckn, sicil)
  if (!calisan) return { hata: GENEL_HATA }

  const authUserId = await authUserIdSifreSifirlaIcin(admin, calisan.sicil_no, email)
  if (!authUserId) {
    return {
      hata: 'Bu e-posta ile sistemde giriş hesabı bulunamadı. Yöneticinize başvurun.',
    }
  }

  return { ok: true }
}

/** Adım 2: kimliği tekrar doğrula + yeni şifre (kurallı) kaydet. */
export async function sifreSifirlaKaydet(formData: FormData): Promise<{ hata?: string }> {
  const { email, tckn, sicil } = formKimlik(formData)
  const sifre = yeniSifreNormalize(String(formData.get('sifre') ?? ''))
  const sifreTekrar = yeniSifreNormalize(String(formData.get('sifre_tekrar') ?? ''))

  if (!email) return { hata: 'E-posta girin.' }
  if (!tckn.trim()) return { hata: 'T.C. kimlik numarası girin.' }
  if (!sicil.trim()) return { hata: 'Sicil numarası girin.' }
  if (!yeniSifreGecerliMi(sifre)) return { hata: yeniSifreHataMetni() }
  if (sifre !== sifreTekrar) return { hata: 'Şifre ile tekrarı eşleşmiyor.' }

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

  revalidatePath('/login')
  return {}
}
