import type { SupabaseClient } from '@supabase/supabase-js'

/** Sadece rakamlar (TCKN karşılaştırması) */
export function tcknRakamlar(tckn: string): string {
  return String(tckn ?? '').replace(/\D/g, '')
}

export function sicilNormalize(sicil: string): string {
  return String(sicil ?? '').trim()
}

/**
 * Şifre sıfırlama: e-posta + TCKN + sicil `calisan` (kadro/belediye) veya
 * `firma_calisanlar` (ADABEL) ile uyuyorsa sicil_no döner.
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

  const eslesir = (satir: { sicil_no: string | null; tckn: string | null }): boolean => {
    if (!satir.sicil_no) return false
    if (tcknRakamlar(satir.tckn ?? '') !== tcknDigits) return false
    return sicilNormalize(satir.sicil_no) === sicil
  }

  // 1) Kadro/belediye personeli (calisan)
  const { data: calRows } = await admin
    .from('calisan')
    .select('sicil_no, tckn, e_posta')
    .ilike('e_posta', email)
  for (const row of calRows ?? []) {
    if (eslesir(row)) return { sicil_no: row.sicil_no! }
  }

  // 2) ADABEL personeli (firma_calisanlar)
  const { data: firmaRows } = await admin
    .from('firma_calisanlar')
    .select('sicil_no, tckn, e_posta')
    .ilike('e_posta', email)
  for (const row of firmaRows ?? []) {
    if (eslesir(row)) return { sicil_no: row.sicil_no! }
  }

  return null
}
