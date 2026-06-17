import type { SupabaseClient } from '@supabase/supabase-js'

export type MahalleTanimSatir = {
  id: number
  il: string
  ilce: string
  mahalle_adi: string
  aktif: boolean
}

export function mahalleTamEtiket(m: Pick<MahalleTanimSatir, 'mahalle_adi' | 'ilce' | 'il'>): string {
  return `${m.mahalle_adi} Mah., ${m.ilce} / ${m.il}`
}

export function personelAdresMetniOlustur(
  mahalle: Pick<MahalleTanimSatir, 'mahalle_adi' | 'ilce' | 'il'> | null | undefined,
  adresDetay: string | null | undefined,
): string | null {
  const detay = String(adresDetay ?? '').trim()
  if (!mahalle) return detay || null
  const temel = mahalleTamEtiket(mahalle)
  return detay ? `${temel} — ${detay}` : temel
}

export function parseMahalleId(raw: unknown): number | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  const n = Number(s)
  if (!Number.isInteger(n) || n <= 0) return null
  return n
}

export async function mahalleKaydiGetir(
  supabase: SupabaseClient,
  id: number,
): Promise<MahalleTanimSatir | null> {
  const { data } = await supabase
    .from('tanim_adres_mahalle')
    .select('id, il, ilce, mahalle_adi, aktif')
    .eq('id', id)
    .maybeSingle()
  if (!data) return null
  return data as MahalleTanimSatir
}

export async function personelAdresFormdan(
  supabase: SupabaseClient,
  formData: FormData,
): Promise<
  | { mahalle_id: number | null; adres_detay: string | null; adresi: string | null }
  | { hata: string }
> {
  const mahalle_id = parseMahalleId(formData.get('mahalle_id'))
  const adres_detay = String(formData.get('adres_detay') ?? '').trim() || null

  if (mahalle_id == null) {
    return { mahalle_id: null, adres_detay, adresi: adres_detay }
  }

  const mahalle = await mahalleKaydiGetir(supabase, mahalle_id)
  if (!mahalle) return { hata: 'Seçilen mahalle tanımı bulunamadı.' }
  if (!mahalle.aktif) return { hata: 'Seçilen mahalle tanımı pasif durumda.' }

  return {
    mahalle_id,
    adres_detay,
    adresi: personelAdresMetniOlustur(mahalle, adres_detay),
  }
}

export async function fetchAktifMahalleTanimlari(supabase: SupabaseClient): Promise<MahalleTanimSatir[]> {
  const { data, error } = await supabase
    .from('tanim_adres_mahalle')
    .select('id, il, ilce, mahalle_adi, aktif')
    .eq('aktif', true)
    .order('il')
    .order('ilce')
    .order('mahalle_adi')

  if (error) throw new Error(error.message)
  return (data ?? []) as MahalleTanimSatir[]
}
