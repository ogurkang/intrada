import { tryCreateServiceRoleClient } from '@/lib/supabase/service-role'
import {
  KULLANICI_ADI_KULLANIMDA_METNI,
  normalizeKullaniciAdi,
} from '@/lib/kullanici-adi'

const KONTROL_HATA = 'Kullanıcı adı kontrol edilemedi. Lütfen tekrar deneyin.'

/** Başka bir profilde aynı kullanıcı adı varsa uyarı metnini döner. Kendi profili hariç tutulur. */
export async function kullaniciAdiCakismaKontrol(
  kullaniciAdi: string,
  haricProfilId?: string,
): Promise<string | null> {
  const ad = normalizeKullaniciAdi(kullaniciAdi)
  const admin = tryCreateServiceRoleClient()
  if (!admin) return KONTROL_HATA

  const { data, error } = await admin
    .from('app_profiles')
    .select('id, kullanici_adi')
    .ilike('kullanici_adi', ad)

  if (error) return KONTROL_HATA

  const cakisma = (data ?? []).some(
    (row) =>
      row.id !== haricProfilId &&
      normalizeKullaniciAdi(String(row.kullanici_adi ?? '')) === ad,
  )
  return cakisma ? KULLANICI_ADI_KULLANIMDA_METNI : null
}
