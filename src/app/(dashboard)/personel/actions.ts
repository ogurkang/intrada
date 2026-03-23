'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function calisanEkle(
  formData: FormData
): Promise<{ hata?: string; sicil_no?: string; public_id?: string }> {
  const sicil_no = String(formData.get('sicil_no') ?? '').trim().toUpperCase()
  const ad_soyad = String(formData.get('ad_soyad') ?? '').trim()

  if (!sicil_no) return { hata: 'Sicil numarası zorunludur.' }
  if (!ad_soyad) return { hata: 'Ad Soyad zorunludur.' }

  const supabase = await createClient()

  // Mükerrer sicil kontrolü
  const { data: mevcut } = await supabase
    .from('calisan')
    .select('sicil_no')
    .eq('sicil_no', sicil_no)
    .maybeSingle()
  if (mevcut) return { hata: `"${sicil_no}" sicil numarası zaten kayıtlı.` }

  const str = (k: string) => String(formData.get(k) ?? '').trim() || null

  const { data: inserted, error } = await supabase
    .from('calisan')
    .insert({
      sicil_no,
      ad_soyad,
      tckn: str('tckn'),
      dogum_tarihi:    str('dogum_tarihi'),
      cinsiyet:        str('cinsiyet'),
      kan_grubu:       str('kan_grubu'),
      telefon:         str('telefon'),
      e_posta:         str('e_posta'),
      dogum_yeri:      str('dogum_yeri'),
      anne_adi:        str('anne_adi'),
      baba_adi:        str('baba_adi'),
      adresi:          str('adresi'),
      yakini:          str('yakini'),
      yakini_telefonu: str('yakini_telefonu'),
      askerlik_durumu: str('askerlik_durumu'),
    })
    .select('sicil_no, public_id')
    .single()

  if (error) return { hata: error.message }
  revalidatePath('/personel')
  return { sicil_no: inserted?.sicil_no, public_id: inserted?.public_id }
}
