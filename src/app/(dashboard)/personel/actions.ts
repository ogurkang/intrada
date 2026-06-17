'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { formdanHizmetSureBilesenleri } from '@/lib/hizmet-suresi-360'
import { gorevTuruTarihZorunlu } from '@/lib/gorev-bilgileri'
import { personelAdresFormdan } from '@/lib/personel-adres'

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
  const hs = formdanHizmetSureBilesenleri(formData)
  const gorev_turu = String(formData.get('gorev_turu') ?? '').trim() || 'Çalışan'
  const gorev_turu_tarihi =
    gorev_turu === 'Çalışan' ? null : str('gorev_turu_tarihi')
  const gorev_turu_aciklama =
    (gorev_turu === 'Geçici Görevlendirme' || gorev_turu === 'Kurum Görevlendirme')
      ? str('gorev_turu_aciklama')
      : null
  if (gorevTuruTarihZorunlu(gorev_turu) && !gorev_turu_tarihi) {
    return { hata: 'Aylıksız izin, geçici görevlendirme veya yarı zamanlı için tarih seçilmelidir.' }
  }
  const hizmetDondur = gorev_turu === 'Aylıksız İzin'

  const adresSonuc = await personelAdresFormdan(supabase, formData)
  if ('hata' in adresSonuc) return { hata: adresSonuc.hata }

  const { data: inserted, error } = await supabase
    .from('calisan')
    .insert({
      sicil_no,
      ad_soyad,
      tckn: str('tckn'),
      sgk_ssk_sicil_no: str('sgk_ssk_sicil_no'),
      dogum_tarihi:    str('dogum_tarihi'),
      cinsiyet:        str('cinsiyet'),
      kan_grubu:       str('kan_grubu'),
      telefon:         str('telefon'),
      e_posta:         str('e_posta'),
      dogum_yeri:      str('dogum_yeri'),
      anne_adi:        str('anne_adi'),
      baba_adi:        str('baba_adi'),
      mahalle_id:      adresSonuc.mahalle_id,
      adres_detay:     adresSonuc.adres_detay,
      adresi:          adresSonuc.adresi,
      yakini:          str('yakini'),
      yakini_telefonu: str('yakini_telefonu'),
      askerlik_durumu: str('askerlik_durumu'),
      memuriyet_tarihi: str('memuriyet_tarihi'),
      kuruma_giris_tarihi: str('kuruma_giris_tarihi'),
      hizmet_suresi_yil: hizmetDondur ? 0 : hs.yil,
      hizmet_suresi_ay: hizmetDondur ? 0 : hs.ay,
      hizmet_suresi_gun: hizmetDondur ? 0 : hs.gun,
      gorev_yeri: str('gorev_yeri'),
      gorev_turu,
      gorev_turu_tarihi,
      gorev_turu_aciklama,
      gorev_durumu: String(formData.get('gorev_durumu') ?? '').trim() || 'Diğer',
    })
    .select('sicil_no, public_id')
    .single()

  if (error) return { hata: error.message }
  revalidatePath('/personel')
  return { sicil_no: inserted?.sicil_no, public_id: inserted?.public_id }
}
