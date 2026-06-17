'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ggAayyyyToIso } from '@/lib/tarih'
import { revalidatePersonelDetayPaths } from '@/lib/revalidate-personel'
import { dogrulaAyrilisAlanlari, personelPasifMi } from '@/lib/personel-ayrilis'
import { kadroPasifeAlPersonelIcin } from '@/lib/kadro-ayrilis-personel'
import { writeKadroBosaltmaAuditLoglari } from '@/lib/kadro-audit'
import { anaKadroSec } from '@/lib/kadro-ana-sicil'
import { formdanHizmetSureBilesenleri } from '@/lib/hizmet-suresi-360'
import { gorevTuruTarihZorunlu } from '@/lib/gorev-bilgileri'
import { personelAdresFormdan } from '@/lib/personel-adres'
import {
  fetchMudurlukYerleskeTanimSatirlari,
  gecerliYerleskeId,
  mudurlukYerleskeHaritasi,
} from '@/lib/yerleske-adresi'
import {
  writePersonelAuditLogSafe,
  alanDegisiklikleriHesapla,
  degisiklikOzeti,
  degisiklikPayload,
} from '@/lib/personel-audit'

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? '').trim()
  return v || null
}

// ─── Kişisel Bilgiler ────────────────────────────────────────────────────────

const CALISAN_ALAN_ETIKETLERI: Record<string, string> = {
  ad_soyad:                'Ad Soyad',
  tckn:                    'TC Kimlik No',
  sgk_ssk_sicil_no:        'SGK/SSK Sicil No',
  dogum_tarihi:            'Doğum Tarihi',
  cinsiyet:                'Cinsiyet',
  kan_grubu:               'Kan Grubu',
  dogum_yeri:              'Doğum Yeri',
  anne_adi:                'Anne Adı',
  baba_adi:                'Baba Adı',
  askerlik_durumu:         'Askerlik Durumu',
  telefon:                 'Telefon',
  e_posta:                 'E-posta',
  mahalle_id:              'Mahalle',
  adres_detay:             'Adres Detayı',
  adresi:                  'Adres',
  yakini:                  'Yakını',
  yakini_telefonu:         'Yakını Telefonu',
  memuriyet_tarihi:        'Memuriyet Tarihi',
  kuruma_giris_tarihi:     'Kuruma Giriş Tarihi',
  gorev_yeri:              'Görev Yeri',
  gorev_turu:              'Görev Türü',
  gorev_turu_tarihi:       'Görev Türü Tarihi',
  gorev_turu_bitis_tarihi: 'Görev Türü Bitiş Tarihi',
  gorev_turu_aciklama:     'Görev Türü Açıklaması',
  gorev_turu_yemek_hakki:  'Yemek Hakkı',
  gorev_durumu:            'Görev Durumu',
  yerleske_adresi_id:      'Yerleşke Adresi',
  hizmet_suresi_yil:       'Hizmet Süresi (Yıl)',
  hizmet_suresi_ay:        'Hizmet Süresi (Ay)',
  hizmet_suresi_gun:       'Hizmet Süresi (Gün)',
}

export async function calisanGuncelle(
  sicil_no: string,
  formData: FormData
): Promise<{ hata?: string }> {
  const ad_soyad = String(formData.get('ad_soyad') ?? '').trim()
  if (!ad_soyad) return { hata: 'Ad Soyad zorunludur.' }

  const gorev_turu = str(formData, 'gorev_turu') ?? 'Çalışan'
  const gorev_turu_tarihi =
    gorev_turu === 'Çalışan' ? null : str(formData, 'gorev_turu_tarihi')
  const gorev_turu_bitis_tarihi =
    gorev_turu === 'Çalışan' ? null : str(formData, 'gorev_turu_bitis_tarihi')
  const gorev_turu_aciklama =
    (gorev_turu === 'Geçici Görevlendirme' || gorev_turu === 'Kurum Görevlendirme')
      ? str(formData, 'gorev_turu_aciklama')
      : null
  const yemekHakkiRaw = str(formData, 'gorev_turu_yemek_hakki')
  const gorev_turu_yemek_hakki =
    (gorev_turu === 'Geçici Görevlendirme' || gorev_turu === 'Kurum Görevlendirme')
      ? (yemekHakkiRaw === 'evet' ? true : yemekHakkiRaw === 'hayir' ? false : null)
      : null
  if (gorevTuruTarihZorunlu(gorev_turu) && !gorev_turu_tarihi) {
    return { hata: 'Aylıksız izin, geçici görevlendirme veya yarı zamanlı için tarih seçilmelidir.' }
  }

  const supabase = await createClient()
  const hs = formdanHizmetSureBilesenleri(formData)
  const hizmetDondur = gorev_turu === 'Aylıksız İzin'

  const yerleskeRaw = str(formData, 'yerleske_adresi_id')
  let yerleske_adresi_id: number | null = null
  if (yerleskeRaw) {
    const yerleskeId = Number(yerleskeRaw)
    if (!Number.isInteger(yerleskeId) || yerleskeId <= 0) {
      return { hata: 'Geçersiz yerleşke seçimi.' }
    }
    yerleske_adresi_id = yerleskeId
  }

  const tanimSatirlar = await fetchMudurlukYerleskeTanimSatirlari(supabase)
  const yerleskeHarita = mudurlukYerleskeHaritasi(tanimSatirlar)
  const D = new Date().toISOString().slice(0, 10)
  const { data: kadroRaw } = await supabase
    .from('kadro_hareketleri')
    .select('asil, gorev_mudurlugu, kadro_mudurlugu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu')
    .or(`asil.eq.${sicil_no},vekil.eq.${sicil_no}`)
  const { secilenKadroSatirAsil } = await import('@/lib/kadro-statu-sec')
  const sec = secilenKadroSatirAsil((kadroRaw ?? []) as Parameters<typeof secilenKadroSatirAsil>[0], D)
  const mudurluk = String(sec?.gorev_mudurlugu ?? sec?.kadro_mudurlugu ?? '').trim()
  if (yerleske_adresi_id != null && !gecerliYerleskeId(yerleskeHarita, mudurluk, yerleske_adresi_id)) {
    return { hata: 'Seçilen yerleşke, görev müdürlüğü ile eşleşmiyor.' }
  }

  const adresSonuc = await personelAdresFormdan(supabase, formData)
  if ('hata' in adresSonuc) return { hata: adresSonuc.hata }

  const temel: Record<string, unknown> = {
    ad_soyad,
    tckn:             str(formData, 'tckn'),
    sgk_ssk_sicil_no: str(formData, 'sgk_ssk_sicil_no'),
    dogum_tarihi:     str(formData, 'dogum_tarihi'),
    cinsiyet:         str(formData, 'cinsiyet'),
    kan_grubu:        str(formData, 'kan_grubu'),
    dogum_yeri:       str(formData, 'dogum_yeri'),
    anne_adi:         str(formData, 'anne_adi'),
    baba_adi:         str(formData, 'baba_adi'),
    askerlik_durumu:  str(formData, 'askerlik_durumu'),
    telefon:          str(formData, 'telefon'),
    e_posta:          str(formData, 'e_posta'),
    mahalle_id:       adresSonuc.mahalle_id,
    adres_detay:      adresSonuc.adres_detay,
    adresi:           adresSonuc.adresi,
    yakini:           str(formData, 'yakini'),
    yakini_telefonu:  str(formData, 'yakini_telefonu'),
    memuriyet_tarihi: str(formData, 'memuriyet_tarihi'),
    kuruma_giris_tarihi: str(formData, 'kuruma_giris_tarihi'),
    gorev_yeri:             str(formData, 'gorev_yeri'),
    gorev_turu,
    gorev_turu_tarihi,
    gorev_turu_bitis_tarihi,
    gorev_turu_aciklama,
    gorev_turu_yemek_hakki,
    gorev_durumu:           str(formData, 'gorev_durumu') ?? 'Diğer',
    yerleske_adresi_id,
  }
  if (!hizmetDondur) {
    temel.hizmet_suresi_yil = hs.yil
    temel.hizmet_suresi_ay = hs.ay
    temel.hizmet_suresi_gun = hs.gun
  }

  const { data: oncekiCalisan } = await supabase
    .from('calisan')
    .select(Object.keys(CALISAN_ALAN_ETIKETLERI).join(', '))
    .eq('sicil_no', sicil_no)
    .maybeSingle()

  const { error } = await supabase.from('calisan').update(temel).eq('sicil_no', sicil_no)

  if (error) return { hata: error.message }

  const degisiklikler = alanDegisiklikleriHesapla(
    (oncekiCalisan ?? null) as Record<string, unknown> | null,
    temel,
    CALISAN_ALAN_ETIKETLERI,
  )
  if (degisiklikler.length > 0) {
    const payload = degisiklikPayload(degisiklikler)
    await writePersonelAuditLogSafe(supabase, {
      sicil_no,
      modul: 'kişisel bilgiler',
      islem: 'Güncelle',
      ozet: degisiklikOzeti(degisiklikler, 'Kişisel bilgiler güncellendi'),
      ref_table: 'calisan',
      ref_id: sicil_no,
      onceki: payload.onceki,
      sonraki: payload.sonraki,
    })
  }

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

  const ayrilis_tarihi = str(formData, 'ayrilis_tarihi')
  const ayrilis_nedeni = str(formData, 'ayrilis_nedeni')
  const ayrilisHata = dogrulaAyrilisAlanlari(ayrilis_tarihi, ayrilis_nedeni)
  if (ayrilisHata) return { hata: ayrilisHata }

  const supabase = await createClient()
  const payload = {
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
    ayrilis_tarihi,
    ayrilis_nedeni,
    dayanak:               str(formData, 'dayanak'),
    aciklama:              str(formData, 'aciklama'),
    dagitim_mudurlukleri:  str(formData, 'dagitim_mudurlukleri'),
    kayit_zamani:          new Date().toISOString(),
  }
  const { data: inserted, error } = await supabase.from('personel_hareketleri').insert(payload).select('id').single()

  if (error) return { hata: error.message }
  if (
    personelPasifMi({ ayrilis_tarihi, ayrilis_nedeni }) &&
    ayrilis_tarihi &&
    ayrilis_nedeni
  ) {
    const kadroAyrilis = await kadroPasifeAlPersonelIcin(supabase, sicil_no, ayrilis_tarihi, ayrilis_nedeni)
    if (kadroAyrilis.hata) return { hata: kadroAyrilis.hata }
    if ((kadroAyrilis.bosaltmaKayitlari ?? []).length > 0) {
      await writeKadroBosaltmaAuditLoglari(supabase, {
        sicil_no,
        ayrilis_nedeni,
        ayrilis_tarihi,
        kayitlar: kadroAyrilis.bosaltmaKayitlari!,
      })
    }
    revalidatePath('/kadro')
    revalidatePath('/personel-hareketleri')
  }
  await writePersonelAuditLogSafe(supabase, {
    sicil_no,
    modul: 'personel',
    islem: 'Hareket Ekle',
    ozet: `${hareket_tipi} hareketi eklendi (${yururluk_tarihi}).`,
    ref_table: 'personel_hareketleri',
    ref_id: String(inserted?.id ?? ''),
    sonraki: payload,
  })
  await revalidatePersonelDetayPaths(sicil_no)
  return {}
}

export async function personelHareketiGuncelle(
  id: number,
  sicil_no: string,
  formData: FormData
): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { data: onceki } = await supabase
    .from('personel_hareketleri')
    .select(
      'hareket_tipi, yururluk_tarihi, kadro_sira_no, yeni_gorev_yeri, yeni_unvan, yeni_sinif, yeni_kadro_derecesi, yeni_kha_derece, yeni_kha_kademe, yeni_ekea_derece, yeni_ekea_kademe, ise_baslama_tarihi, ayrilis_tarihi, ayrilis_nedeni, dayanak, aciklama, dagitim_mudurlukleri',
    )
    .eq('id', id)
    .maybeSingle()
  const ayrilis_tarihi = str(formData, 'ayrilis_tarihi')
  const ayrilis_nedeni = str(formData, 'ayrilis_nedeni')
  const ayrilisHata = dogrulaAyrilisAlanlari(ayrilis_tarihi, ayrilis_nedeni)
  if (ayrilisHata) return { hata: ayrilisHata }

  const payload = {
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
    ayrilis_tarihi,
    ayrilis_nedeni,
    dayanak:               str(formData, 'dayanak'),
    aciklama:              str(formData, 'aciklama'),
    dagitim_mudurlukleri:  str(formData, 'dagitim_mudurlukleri'),
  }
  const { error } = await supabase.from('personel_hareketleri').update(payload).eq('id', id)

  if (error) return { hata: error.message }
  if (
    personelPasifMi({ ayrilis_tarihi, ayrilis_nedeni }) &&
    ayrilis_tarihi &&
    ayrilis_nedeni
  ) {
    const kadroAyrilis = await kadroPasifeAlPersonelIcin(supabase, sicil_no, ayrilis_tarihi, ayrilis_nedeni)
    if (kadroAyrilis.hata) return { hata: kadroAyrilis.hata }
    if ((kadroAyrilis.bosaltmaKayitlari ?? []).length > 0) {
      await writeKadroBosaltmaAuditLoglari(supabase, {
        sicil_no,
        ayrilis_nedeni,
        ayrilis_tarihi,
        kayitlar: kadroAyrilis.bosaltmaKayitlari!,
      })
    }
    revalidatePath('/kadro')
    revalidatePath('/personel-hareketleri')
  }
  await writePersonelAuditLogSafe(supabase, {
    sicil_no,
    modul: 'personel',
    islem: 'Hareket Güncelle',
    ozet: `${payload.hareket_tipi ?? 'Hareket'} kaydı güncellendi.`,
    ref_table: 'personel_hareketleri',
    ref_id: String(id),
    onceki: onceki ?? null,
    sonraki: payload,
  })
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

  const payload = {
    sicil_no,
    ogrenim_turu: str(fd, 'ogrenim_turu'),
    okul_adi: str(fd, 'okul_adi'),
    bolum: str(fd, 'bolum'),
    meslegi: str(fd, 'meslegi'),
    mezuniyet_yili: str(fd, 'mezuniyet_yili') ? parseInt(String(fd.get('mezuniyet_yili')), 10) : null,
    mezuniyet_tarihi: mezIso(str(fd, 'mezuniyet_tarihi')),
    varsayilan,
    aktif: varsayilan,
  }
  const { data: inserted, error } = await supabase.from('calisan_ogrenim').insert(payload).select('id').single()
  if (error) return { hata: error.message }
  await writePersonelAuditLogSafe(supabase, {
    sicil_no,
    modul: 'öğrenim',
    islem: 'Ekle',
    ozet: `${payload.ogrenim_turu ?? 'Öğrenim'} kaydı eklendi.`,
    ref_table: 'calisan_ogrenim',
    ref_id: String(inserted?.id ?? ''),
    sonraki: payload,
  })
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
  const { data: onceki } = await supabase
    .from('calisan_ogrenim')
    .select('ogrenim_turu, okul_adi, bolum, meslegi, mezuniyet_yili, mezuniyet_tarihi, varsayilan, aktif')
    .eq('id', id)
    .maybeSingle()

  const payload = {
    ogrenim_turu: str(fd, 'ogrenim_turu'),
    okul_adi: str(fd, 'okul_adi'),
    bolum: str(fd, 'bolum'),
    meslegi: str(fd, 'meslegi'),
    mezuniyet_yili: str(fd, 'mezuniyet_yili') ? parseInt(String(fd.get('mezuniyet_yili')), 10) : null,
    mezuniyet_tarihi: mezIso(str(fd, 'mezuniyet_tarihi')),
    varsayilan,
    aktif: varsayilan,
  }
  const { error } = await supabase
    .from('calisan_ogrenim')
    .update(payload)
    .eq('id', id)
  if (error) return { hata: error.message }
  await writePersonelAuditLogSafe(supabase, {
    sicil_no,
    modul: 'öğrenim',
    islem: 'Güncelle',
    ozet: `${payload.ogrenim_turu ?? 'Öğrenim'} kaydı güncellendi.`,
    ref_table: 'calisan_ogrenim',
    ref_id: String(id),
    onceki: onceki ?? null,
    sonraki: payload,
  })
  await revalidatePersonelDetayPaths(sicil_no)
  revalidatePath('/bildirim/ogrenim')
  return {}
}

export async function ogrenimSil(
  id: number,
  sicil_no: string
): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { data: onceki } = await supabase
    .from('calisan_ogrenim')
    .select('ogrenim_turu, okul_adi, bolum, meslegi, mezuniyet_yili, mezuniyet_tarihi, varsayilan, aktif')
    .eq('id', id)
    .maybeSingle()
  const { error } = await supabase.from('calisan_ogrenim').delete().eq('id', id)
  if (error) return { hata: error.message }
  await writePersonelAuditLogSafe(supabase, {
    sicil_no,
    modul: 'öğrenim',
    islem: 'Sil',
    ozet: `${onceki?.ogrenim_turu ?? 'Öğrenim'} kaydı silindi.`,
    ref_table: 'calisan_ogrenim',
    ref_id: String(id),
    onceki: onceki ?? null,
  })
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
  const { data: onceki } = await supabase
    .from('aile_bildirimi')
    .select('medeni_hal, esin_ad_soyad, esin_tckn, is_durumu, gelir_durumu, cocuklar_json')
    .eq('sicil_no', sicil_no)
    .maybeSingle()
  const payload = {
    sicil_no,
    medeni_hal:    str(fd, 'medeni_hal'),
    esin_ad_soyad: str(fd, 'esin_ad_soyad'),
    esin_tckn:     str(fd, 'esin_tckn'),
    is_durumu:     str(fd, 'is_durumu'),
    gelir_durumu:  str(fd, 'gelir_durumu'),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    cocuklar_json,
  }
  const { error } = await supabase.from('aile_bildirimi').upsert({
    ...payload,
  }, { onConflict: 'sicil_no' })
  if (error) return { hata: error.message }
  await writePersonelAuditLogSafe(supabase, {
    sicil_no,
    modul: 'aile',
    islem: onceki ? 'Güncelle' : 'Ekle',
    ozet: onceki ? 'Aile bildirimi güncellendi.' : 'Aile bildirimi eklendi.',
    ref_table: 'aile_bildirimi',
    ref_id: sicil_no,
    onceki: onceki ?? null,
    sonraki: payload,
  })
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
  const { data: onceki } = await supabase
    .from('izin_haklari')
    .select('yil, devreden_gun, hak_edilen_gun, kullanilan_gun, kalan_gun')
    .eq('sicil_no', sicil_no)
    .eq('yil', yil)
    .maybeSingle()
  const payload = {
    yil,
    sicil_no,
    devreden_gun:   Math.max(0, devreden_gun),
    hak_edilen_gun: Math.max(0, hak_edilen_gun),
  }

  // UPSERT: yil+sicil_no unique constraint var
  const { error } = await supabase.from('izin_haklari').upsert(
    payload,
    { onConflict: 'yil,sicil_no' }
  )

  if (error) return { hata: error.message }
  await writePersonelAuditLogSafe(supabase, {
    sicil_no,
    modul: 'izin hakkı',
    islem: onceki ? 'Güncelle' : 'Ekle',
    ozet: `${yil} yılı izin hakkı ${onceki ? 'güncellendi' : 'eklendi'}.`,
    ref_table: 'izin_haklari',
    ref_id: `${sicil_no}-${yil}`,
    onceki: onceki ?? null,
    sonraki: payload,
  })
  await revalidatePersonelDetayPaths(sicil_no)
  return {}
}

// ─── Aylıksız İzinden Dön ─────────────────────────────────────────────────────

/**
 * Aylıksız izinden işe dönüş tarihi kaydeder.
 * `iseDonus` = personelin fiilen işe başladığı gün (YYYY-MM-DD).
 * `gorev_turu_bitis_tarihi` = iseDonus - 1 gün olarak saklanır.
 * İşe dönüş günü aylık yemek hakkının ilk günüdür; bir önceki gün aylıksız iznin son günüdür.
 */
export async function ayliksizIzindenDon(
  sicil_no: string,
  iseDonus: string,
): Promise<{ hata?: string }> {
  if (!iseDonus) return { hata: 'İşe dönüş tarihi zorunludur.' }

  const donus = new Date(iseDonus)
  if (isNaN(donus.getTime())) return { hata: 'Geçersiz tarih.' }

  const bitisDate = new Date(donus)
  bitisDate.setDate(bitisDate.getDate() - 1)
  const bitis = bitisDate.toISOString().slice(0, 10)

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: mevcut, error: fetchErr } = await db
    .from('calisan')
    .select('gorev_turu, gorev_turu_bitis_tarihi')
    .eq('sicil_no', sicil_no)
    .single() as { data: { gorev_turu: string | null; gorev_turu_bitis_tarihi: string | null } | null; error: { message: string } | null }
  if (fetchErr) return { hata: fetchErr.message }
  if (mevcut?.gorev_turu !== 'Aylıksız İzin') return { hata: 'Personelin görevi aylıksız izin değil.' }

  const { error: updErr } = await db
    .from('calisan')
    .update({ gorev_turu_bitis_tarihi: bitis })
    .eq('sicil_no', sicil_no) as { error: { message: string } | null }
  if (updErr) return { hata: updErr.message }

  await writePersonelAuditLogSafe(supabase, {
    sicil_no,
    modul: 'görev bilgileri',
    islem: 'Güncelle',
    ozet: `Aylıksız izin bitiş tarihi ${bitis} olarak güncellendi (işe dönüş: ${iseDonus}).`,
    ref_table: 'calisan',
    ref_id: sicil_no,
    onceki: { gorev_turu_bitis_tarihi: mevcut?.gorev_turu_bitis_tarihi ?? null },
    sonraki: { gorev_turu_bitis_tarihi: bitis },
  })

  await revalidatePersonelDetayPaths(sicil_no)
  return {}
}
