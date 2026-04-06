'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ggAayyyyToIso } from '@/lib/tarih'
import { revalidatePersonelDetayPaths } from '@/lib/revalidate-personel'
import { anaKadroSec } from '@/lib/kadro-ana-sicil'
import { formdanHizmetSureBilesenleri } from '@/lib/hizmet-suresi-360'
import { gorevTuruTarihZorunlu } from '@/lib/gorev-bilgileri'

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

  const gorev_turu = str(formData, 'gorev_turu') ?? 'Çalışan'
  const gorev_turu_tarihi =
    gorev_turu === 'Çalışan' ? null : str(formData, 'gorev_turu_tarihi')
  const gorev_turu_aciklama =
    gorev_turu === 'Geçici Görevlendirme' ? str(formData, 'gorev_turu_aciklama') : null
  if (gorevTuruTarihZorunlu(gorev_turu) && !gorev_turu_tarihi) {
    return { hata: 'Aylıksız izin veya geçici görevlendirme için tarih seçilmelidir.' }
  }

  const supabase = await createClient()
  const hs = formdanHizmetSureBilesenleri(formData)
  const hizmetDondur = gorev_turu === 'Aylıksız İzin'

  const temel: Record<string, unknown> = {
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
    memuriyet_tarihi: str(formData, 'memuriyet_tarihi'),
    kuruma_giris_tarihi: str(formData, 'kuruma_giris_tarihi'),
    gorev_yeri:       str(formData, 'gorev_yeri'),
    gorev_turu,
    gorev_turu_tarihi,
    gorev_turu_aciklama,
    gorev_durumu:     str(formData, 'gorev_durumu') ?? 'Diğer',
  }
  if (!hizmetDondur) {
    temel.hizmet_suresi_yil = hs.yil
    temel.hizmet_suresi_ay = hs.ay
    temel.hizmet_suresi_gun = hs.gun
  }

  const { error } = await supabase.from('calisan').update(temel).eq('sicil_no', sicil_no)

  if (error) return { hata: error.message }

  const { data: khRows, error: khErr } = await supabase
    .from('kadro_hareketleri')
    .select('*')
    .or(`asil.eq.${sicil_no},vekil.eq.${sicil_no}`)
  if (khErr) return { hata: khErr.message }
  const ana = anaKadroSec(khRows ?? [], sicil_no)
  if (ana?.id != null) {
    const { error: ktErr } = await supabase
      .from('kadro_hareketleri')
      .update({
        memuriyet_tarihi: str(formData, 'memuriyet_tarihi'),
        kuruma_giris_tarihi: str(formData, 'kuruma_giris_tarihi'),
      })
      .eq('id', ana.id)
    if (ktErr) return { hata: ktErr.message }
    revalidatePath(`/kadro/${ana.id}`)
    revalidatePath('/kadro')
  }

  await revalidatePersonelDetayPaths(sicil_no)
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
  await revalidatePersonelDetayPaths(sicil_no)
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
  await revalidatePersonelDetayPaths(sicil_no)
  return {}
}

// ─── Öğrenim Bilgileri ───────────────────────────────────────────────────────

function mezIso(val: string | null | undefined): string | null {
  if (!val?.trim()) return null
  return ggAayyyyToIso(val.trim().replace(/\//g, '.'))
}

async function digerOgrenimVarsayilanKapat(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sicil_no: string,
  haricId: number | null
) {
  let q = supabase.from('calisan_ogrenim').update({ varsayilan: false, aktif: false }).eq('sicil_no', sicil_no)
  if (haricId != null) q = q.neq('id', haricId)
  await q
}

export async function ogrenimEkle(
  sicil_no: string,
  fd: FormData
): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const varsayilan = fd.get('varsayilan') === 'true' || fd.get('varsayilan') === 'on'
  if (varsayilan) await digerOgrenimVarsayilanKapat(supabase, sicil_no, null)

  const { error } = await supabase.from('calisan_ogrenim').insert({
    sicil_no,
    ogrenim_turu: str(fd, 'ogrenim_turu'),
    okul_adi: str(fd, 'okul_adi'),
    bolum: str(fd, 'bolum'),
    meslegi: str(fd, 'meslegi'),
    mezuniyet_yili: str(fd, 'mezuniyet_yili') ? parseInt(String(fd.get('mezuniyet_yili')), 10) : null,
    mezuniyet_tarihi: mezIso(str(fd, 'mezuniyet_tarihi')),
    varsayilan,
    aktif: varsayilan,
  })
  if (error) return { hata: error.message }
  await revalidatePersonelDetayPaths(sicil_no)
  revalidatePath('/bildirim/ogrenim')
  return {}
}

export async function ogrenimGuncelle(
  id: number,
  sicil_no: string,
  fd: FormData
): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const varsayilan = fd.get('varsayilan') === 'true' || fd.get('varsayilan') === 'on'
  if (varsayilan) await digerOgrenimVarsayilanKapat(supabase, sicil_no, id)

  const { error } = await supabase
    .from('calisan_ogrenim')
    .update({
      ogrenim_turu: str(fd, 'ogrenim_turu'),
      okul_adi: str(fd, 'okul_adi'),
      bolum: str(fd, 'bolum'),
      meslegi: str(fd, 'meslegi'),
      mezuniyet_yili: str(fd, 'mezuniyet_yili') ? parseInt(String(fd.get('mezuniyet_yili')), 10) : null,
      mezuniyet_tarihi: mezIso(str(fd, 'mezuniyet_tarihi')),
      varsayilan,
      aktif: varsayilan,
    })
    .eq('id', id)
  if (error) return { hata: error.message }
  await revalidatePersonelDetayPaths(sicil_no)
  revalidatePath('/bildirim/ogrenim')
  return {}
}

export async function ogrenimSil(
  id: number,
  sicil_no: string
): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('calisan_ogrenim').delete().eq('id', id)
  if (error) return { hata: error.message }
  await revalidatePersonelDetayPaths(sicil_no)
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
  await revalidatePersonelDetayPaths(sicil_no)
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
  await revalidatePersonelDetayPaths(sicil_no)
  return {}
}
