import type { SupabaseClient } from '@supabase/supabase-js'

/** Sadece rakamlar (TCKN karşılaştırması) */
export function tcknRakamlar(tckn: string): string {
  return String(tckn ?? '').replace(/\D/g, '')
}

export function sicilNormalize(sicil: string): string {
  return String(sicil ?? '').trim()
}

/**
 * Şifre sıfırlama: e-posta + TCKN + sicil `calisan` ile uyuyorsa sicil_no döner.
 * Hatalı veya belirsiz durumda null (genel hata mesajı gösterilir).
 */
export async function calisanBulSifreSifirlaIcin(
  admin: SupabaseClient,
  emailRaw: string,
  tcknRaw: string,
  sicilRaw: string,
): Promise<{ sicil_no: string } | null> {
  const email = emailRaw.trim().toLowerCase()
  const tcknDigits = tcknRakamlar(tcknRaw)
  const sicil = sicilNormalize(sicilRaw)

  if (!email || tcknDigits.length !== 11 || !sicil) return null

  const { data: rows, error } = await admin
    .from('calisan')
    .select('sicil_no, tckn, e_posta')
    .ilike('e_posta', email)

  if (error || !rows?.length) return null

  for (const row of rows) {
    const dbTckn = tcknRakamlar(row.tckn ?? '')
    if (dbTckn !== tcknDigits) continue
    if (sicilNormalize(row.sicil_no) !== sicil) continue
    return { sicil_no: row.sicil_no }
  }

  return null
}
