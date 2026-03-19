'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? '').trim()
  return v || null
}

// ─── Kişisel Bilgiler ────────────────────────────────────────────────────────

export async function calisanGuncelle(
  sicil_no: string,
  formData: FormData
): Promise<{ hata?: string }> {
  const ad_soyad = String(formData.get('ad_soyad') ?? '').trim()
  if (!ad_soyad) return { hata: 'Ad Soyad zorunludur.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('calisan')
    .update({
      ad_soyad,
      tckn:             str(formData, 'tckn'),
      dogum_tarihi:     str(formData, 'dogum_tarihi'),
      cinsiyet:         str(formData, 'cinsiyet'),
      kan_grubu:        str(formData, 'kan_grubu'),
      dogum_yeri:       str(formData, 'dogum_yeri'),
      anne_adi:         str(formData, 'anne_adi'),
      baba_adi:         str(formData, 'baba_adi'),
      askerlik_durumu:  str(formData, 'askerlik_durumu'),
      telefon:          str(formData, 'telefon'),
      e_posta:          str(formData, 'e_posta'),
      adresi:           str(formData, 'adresi'),
      yakini:           str(formData, 'yakini'),
      yakini_telefonu:  str(formData, 'yakini_telefonu'),
    })
    .eq('sicil_no', sicil_no)

  if (error) return { hata: error.message }
  revalidatePath(`/personel/${sicil_no}`)
  revalidatePath('/personel')
  return {}
}

// ─── Personel Hareketleri ────────────────────────────────────────────────────

export async function personelHareketiEkle(
  sicil_no: string,
  formData: FormData
): Promise<{ hata?: string }> {
  const hareket_tipi   = str(formData, 'hareket_tipi')
  const yururluk_tarihi = str(formData, 'yururluk_tarihi')
  if (!hareket_tipi)    return { hata: 'Hareket tipi zorunludur.' }
  if (!yururluk_tarihi) return { hata: 'Yürürlük tarihi zorunludur.' }

  const supabase = await createClient()
  const { error } = await supabase.from('personel_hareketleri').insert({
    sicil_no,
    hareket_tipi,
    yururluk_tarihi,
    kadro_sira_no:         str(formData, 'kadro_sira_no'),
    yeni_gorev_yeri:       str(formData, 'yeni_gorev_yeri'),
    yeni_unvan:            str(formData, 'yeni_unvan'),
    yeni_sinif:            str(formData, 'yeni_sinif'),
    yeni_kadro_derecesi:   str(formData, 'yeni_kadro_derecesi'),
    yeni_kha_derece:       str(formData, 'yeni_kha_derece'),
    yeni_kha_kademe:       str(formData, 'yeni_kha_kademe'),
    yeni_ekea_derece:      str(formData, 'yeni_ekea_derece'),
    yeni_ekea_kademe:      str(formData, 'yeni_ekea_kademe'),
    ise_baslama_tarihi:    str(formData, 'ise_baslama_tarihi'),
    ayrilis_tarihi:        str(formData, 'ayrilis_tarihi'),
    dayanak:               str(formData, 'dayanak'),
    aciklama:              str(formData, 'aciklama'),
    dagitim_mudurlukleri:  str(formData, 'dagitim_mudurlukleri'),
    kayit_zamani:          new Date().toISOString(),
  })

  if (error) return { hata: error.message }
  revalidatePath(`/personel/${sicil_no}`)
  return {}
}

export async function personelHareketiGuncelle(
  id: number,
  sicil_no: string,
  formData: FormData
): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('personel_hareketleri').update({
    hareket_tipi:          str(formData, 'hareket_tipi'),
    yururluk_tarihi:       str(formData, 'yururluk_tarihi'),
    kadro_sira_no:         str(formData, 'kadro_sira_no'),
    yeni_gorev_yeri:       str(formData, 'yeni_gorev_yeri'),
    yeni_unvan:            str(formData, 'yeni_unvan'),
    yeni_sinif:            str(formData, 'yeni_sinif'),
    yeni_kadro_derecesi:   str(formData, 'yeni_kadro_derecesi'),
    yeni_kha_derece:       str(formData, 'yeni_kha_derece'),
    yeni_kha_kademe:       str(formData, 'yeni_kha_kademe'),
    yeni_ekea_derece:      str(formData, 'yeni_ekea_derece'),
    yeni_ekea_kademe:      str(formData, 'yeni_ekea_kademe'),
    ise_baslama_tarihi:    str(formData, 'ise_baslama_tarihi'),
    ayrilis_tarihi:        str(formData, 'ayrilis_tarihi'),
    dayanak:               str(formData, 'dayanak'),
    aciklama:              str(formData, 'aciklama'),
    dagitim_mudurlukleri:  str(formData, 'dagitim_mudurlukleri'),
  }).eq('id', id)

  if (error) return { hata: error.message }
  revalidatePath(`/personel/${sicil_no}`)
  return {}
}

// ─── Öğrenim Bilgileri ───────────────────────────────────────────────────────

export async function ogrenimEkle(
  sicil_no: string,
  fd: FormData
): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('calisan_ogrenim').insert({
    sicil_no,
    ogrenim_turu:   str(fd, 'ogrenim_turu'),
    okul_adi:       str(fd, 'okul_adi'),
    bolum:          str(fd, 'bolum'),
    mezuniyet_yili: str(fd, 'mezuniyet_yili') ? parseInt(String(fd.get('mezuniyet_yili')), 10) : null,
    aktif:          true,
  })
  if (error) return { hata: error.message }
  revalidatePath(`/personel/${sicil_no}`)
  return {}
}

export async function ogrenimGuncelle(
  id: number,
  sicil_no: string,
  fd: FormData
): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('calisan_ogrenim').update({
    ogrenim_turu:   str(fd, 'ogrenim_turu'),
    okul_adi:       str(fd, 'okul_adi'),
    bolum:          str(fd, 'bolum'),
    mezuniyet_yili: str(fd, 'mezuniyet_yili') ? parseInt(String(fd.get('mezuniyet_yili')), 10) : null,
  }).eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath(`/personel/${sicil_no}`)
  return {}
}

export async function ogrenimSil(
  id: number,
  sicil_no: string
): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('calisan_ogrenim').delete().eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath(`/personel/${sicil_no}`)
  return {}
}

// ─── Aile Bildirimi ───────────────────────────────────────────────────────────

export async function aileKaydet(
  sicil_no: string,
  fd: FormData
): Promise<{ hata?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cocuklar_json: any = []
  try {
    const raw = String(fd.get('cocuklar_json') ?? '[]')
    cocuklar_json = JSON.parse(raw)
  } catch {
    return { hata: 'Çocuk bilgileri geçersiz.' }
  }
  const supabase = await createClient()
  const { error } = await supabase.from('aile_bildirimi').upsert({
    sicil_no,
    medeni_hal:    str(fd, 'medeni_hal'),
    esin_ad_soyad: str(fd, 'esin_ad_soyad'),
    esin_tckn:     str(fd, 'esin_tckn'),
    is_durumu:     str(fd, 'is_durumu'),
    gelir_durumu:  str(fd, 'gelir_durumu'),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    cocuklar_json,
  }, { onConflict: 'sicil_no' })
  if (error) return { hata: error.message }
  revalidatePath(`/personel/${sicil_no}`)
  return {}
}

// ─── İzin Hakları ────────────────────────────────────────────────────────────

export async function izinHakiEkleGuncelle(
  sicil_no: string,
  formData: FormData
): Promise<{ hata?: string }> {
  const yil           = parseInt(String(formData.get('yil') ?? '0'), 10)
  const devreden_gun  = parseInt(String(formData.get('devreden_gun')  ?? '0'), 10)
  const hak_edilen_gun = parseInt(String(formData.get('hak_edilen_gun') ?? '0'), 10)

  if (!yil || yil < 2000 || yil > 2100) return { hata: 'Geçerli bir yıl giriniz.' }

  const supabase = await createClient()

  // UPSERT: yil+sicil_no unique constraint var
  const { error } = await supabase.from('izin_haklari').upsert(
    {
      yil,
      sicil_no,
      devreden_gun:   Math.max(0, devreden_gun),
      hak_edilen_gun: Math.max(0, hak_edilen_gun),
    },
    { onConflict: 'yil,sicil_no' }
  )

  if (error) return { hata: error.message }
  revalidatePath(`/personel/${sicil_no}`)
  return {}
}
