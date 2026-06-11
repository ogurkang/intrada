'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { revalidatePersonelDetayPaths } from '@/lib/revalidate-personel'
import { ggAayyyyToIso } from '@/lib/tarih'
import { dogrulaAyrilisAlanlari, personelPasifMi } from '@/lib/personel-ayrilis'
import { kadroPasifeAlPersonelIcin } from '@/lib/kadro-ayrilis-personel'
import { writeKadroBosaltmaAuditLoglari } from '@/lib/kadro-audit'
import {
  TERFI_AUDIT_SELECT,
  TERFI_KATSAYI_ALAN_ETIKETLERI,
  logTerfiDegisiklikSafe,
  terfiAuditSnapshot,
} from '@/lib/terfi-audit'
import {
  writePersonelAuditLogSafe,
  alanDegisiklikleriHesapla,
  degisiklikOzeti,
  degisiklikPayload,
} from '@/lib/personel-audit'

const HAREKET_ALAN_ETIKETLERI: Record<string, string> = {
  hareket_tipi:         'Hareket Tipi',
  yururluk_tarihi:      'Yürürlük Tarihi',
  kadro_sira_no:        'Kadro Sıra No',
  yeni_gorev_yeri:      'Yeni Görev Yeri',
  yeni_unvan:           'Yeni Unvan',
  yeni_sinif:           'Yeni Sınıf',
  yeni_kadro_derecesi:  'Yeni Kadro Derecesi',
  yeni_kha_derece:      'KHA Derece',
  yeni_kha_kademe:      'KHA Kademe',
  yeni_ekea_derece:     'EKEA Derece',
  yeni_ekea_kademe:     'EKEA Kademe',
  yeni_kidem_yili:      'Kıdem Yılı',
  yeni_oht:             'ÖHT',
  yeni_igz:             'Yan Ödeme',
  yeni_ek_odeme:        'Ek Ödeme',
  yeni_ek_gosterge:     'Ek Gösterge',
  ise_baslama_tarihi:   'İşe Başlama Tarihi',
  ayrilis_tarihi:       'Ayrılış Tarihi',
  ayrilis_nedeni:       'Ayrılış Nedeni',
  dayanak:              'Dayanak',
  aciklama:             'Açıklama',
  dagitim_mudurlukleri: 'Dağıtım Müdürlükleri',
}

function trTarih(v: string | null): string {
  if (!v) return ''
  const [y, m, d] = v.slice(0, 10).split('-')
  return d && m && y ? `${d}.${m}.${y}` : v
}

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? '').trim()
  return v || null
}

function tarihStr(fd: FormData, key: string): string | null {
  const v = str(fd, key)
  if (!v) return null
  return ggAayyyyToIso(v) ?? v
}

async function terfiSenkronPersonelHareketinden(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sicil_no: string,
  hareketId: number,
  guncelleme: Record<string, string | null>,
): Promise<string | undefined> {
  const { data: sonTerfi } = await supabase
    .from('terfi_hareketleri')
    .select(`id, ${TERFI_AUDIT_SELECT}`)
    .eq('sicil_no', sicil_no)
    .order('kayit_zamani', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!sonTerfi?.id) return undefined

  const oncekiSnap = terfiAuditSnapshot(sonTerfi, TERFI_KATSAYI_ALAN_ETIKETLERI)
  const { error: terfiErr } = await supabase
    .from('terfi_hareketleri')
    .update(guncelleme)
    .eq('id', sonTerfi.id)
  if (terfiErr) return terfiErr.message

  await logTerfiDegisiklikSafe(supabase, {
    sicil_no,
    terfiId: sonTerfi.id,
    islem: 'Hareket Senkron',
    ozetBaslik: 'Personel hareketi ile terfi senkronize edildi',
    onceki: oncekiSnap,
    sonraki: terfiAuditSnapshot({ ...sonTerfi, ...guncelleme }, TERFI_KATSAYI_ALAN_ETIKETLERI),
    ozetEk: hareketId > 0 ? `(hareket #${hareketId})` : undefined,
  })
  return undefined
}

async function kadroAtamasiniGuncelle(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    sicil_no: string | null | undefined
    onceki_kadro_id: number | null
    onceki_kadro_rol: 'asil' | 'vekil'
    yeni_kadro_id: number | null
  },
): Promise<{ hata?: string }> {
  const sicil = String(input.sicil_no ?? '').trim()
  if (!sicil || !input.onceki_kadro_id) return {}

  const oncekiRol = input.onceki_kadro_rol
  const yeniKadroId = input.yeni_kadro_id
  if (yeniKadroId && yeniKadroId === input.onceki_kadro_id) return {}

  const { data: onceki, error: oncekiErr } = await supabase
    .from('kadro_hareketleri')
    .select('id, asil, vekil')
    .eq('id', input.onceki_kadro_id)
    .limit(1)
    .maybeSingle()
  if (oncekiErr) return { hata: oncekiErr.message }
  if (!onceki) return { hata: 'Mevcut kadro kaydı bulunamadı.' }

  const oncekiAsil = String(onceki.asil ?? '').trim()
  const oncekiVekil = String(onceki.vekil ?? '').trim()
  const oncekiUpdate: { asil?: string | null; vekil?: string | null; durumu?: 'Dolu' | 'Vekil' | 'Boş' } = {}
  if (oncekiRol === 'asil' && oncekiAsil === sicil) oncekiUpdate.asil = null
  if (oncekiRol === 'vekil' && oncekiVekil === sicil) oncekiUpdate.vekil = null

  const asilSon = oncekiUpdate.asil === null ? '' : oncekiAsil
  const vekilSon = oncekiUpdate.vekil === null ? '' : oncekiVekil
  oncekiUpdate.durumu = asilSon ? 'Dolu' : (vekilSon ? 'Vekil' : 'Boş')

  const { error: oncekiUpErr } = await supabase
    .from('kadro_hareketleri')
    .update(oncekiUpdate)
    .eq('id', onceki.id)
  if (oncekiUpErr) return { hata: oncekiUpErr.message }

  if (!yeniKadroId) return {}

  const { data: yeni, error: yeniErr } = await supabase
    .from('kadro_hareketleri')
    .select('id, asil, vekil, durumu')
    .eq('id', yeniKadroId)
    .limit(1)
    .maybeSingle()
  if (yeniErr) return { hata: yeniErr.message }
  if (!yeni) return { hata: 'Yeni kadro kaydı bulunamadı.' }
  if ((yeni.durumu ?? '').trim() !== 'Boş') return { hata: 'Seçilen yeni kadro artık boş değil. Lütfen listeyi yenileyin.' }

  const yeniUpdate: { asil?: string | null; vekil?: string | null; durumu?: 'Dolu' | 'Vekil' | 'Boş' } = {}
  if (oncekiRol === 'asil') yeniUpdate.asil = sicil
  else yeniUpdate.vekil = sicil

  const yeniAsilSon = oncekiRol === 'asil' ? sicil : String(yeni.asil ?? '').trim()
  const yeniVekilSon = oncekiRol === 'vekil' ? sicil : String(yeni.vekil ?? '').trim()
  yeniUpdate.durumu = yeniAsilSon ? 'Dolu' : (yeniVekilSon ? 'Vekil' : 'Boş')

  const { error: yeniUpErr } = await supabase
    .from('kadro_hareketleri')
    .update(yeniUpdate)
    .eq('id', yeni.id)
  if (yeniUpErr) return { hata: yeniUpErr.message }

  return {}
}

async function kadroMudurlukleriniEsitle(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sicil_no: string | null | undefined,
  kadro_sira_no: string | null | undefined,
  yeni_gorev_yeri: string | null | undefined,
): Promise<{ hata?: string }> {
  if (!sicil_no || !kadro_sira_no || !yeni_gorev_yeri) return {}
  const sicil = sicil_no.trim()
  const kadroNo = kadro_sira_no.trim()
  const mudurluk = yeni_gorev_yeri.trim()
  if (!sicil || !kadroNo || !mudurluk) return {}

  const { data: byKadroNo, error: byKadroNoErr } = await supabase
    .from('kadro_hareketleri')
    .update({
      kadro_mudurlugu: mudurluk,
      gorev_mudurlugu: mudurluk,
    })
    .eq('kadro_sira_no', kadroNo)
    .or(`asil.eq.${sicil},vekil.eq.${sicil}`)
    .is('ayrilis_tarihi', null)
    .select('id')
  if (byKadroNoErr) return { hata: byKadroNoErr.message }
  if ((byKadroNo ?? []).length > 0) return {}

  // Kadro sıra no birebir eşleşmezse (eski/boş/format farkı), personelin aktif kadrolarını güncelle.
  const { data: byAktif, error: byAktifErr } = await supabase
    .from('kadro_hareketleri')
    .update({
      kadro_mudurlugu: mudurluk,
      gorev_mudurlugu: mudurluk,
    })
    .or(`asil.eq.${sicil},vekil.eq.${sicil}`)
    .is('ayrilis_tarihi', null)
    .select('id')
  if (byAktifErr) return { hata: byAktifErr.message }
  if ((byAktif ?? []).length > 0) return {}

  // Son çare: ayrılışlı eski satırlar dahil personelin tüm kadrolarında aynı sıra no varsa güncelle.
  const { data: byAll, error: byAllErr } = await supabase
    .from('kadro_hareketleri')
    .update({
      kadro_mudurlugu: mudurluk,
      gorev_mudurlugu: mudurluk,
    })
    .eq('kadro_sira_no', kadroNo)
    .or(`asil.eq.${sicil},vekil.eq.${sicil}`)
    .select('id')
  if (byAllErr) return { hata: byAllErr.message }
  if ((byAll ?? []).length > 0) return {}

  return {
    hata:
      'Kadro müdürlüğü güncellenemedi: personel için eşleşen kadro satırı bulunamadı. (Sicil/Kadro Sıra No kontrol edin.)',
  }
  return {}
}

export async function personelHareketiGuncelle(
  id: number,
  formData: FormData
): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const hareket_tipi = str(formData, 'hareket_tipi')
  if (!hareket_tipi) return { hata: 'Hareket Tipi seçimini tamamlayınız.' }
  const { data: row } = await supabase
    .from('personel_hareketleri')
    .select(`sicil_no, ${Object.keys(HAREKET_ALAN_ETIKETLERI).join(', ')}`)
    .eq('id', id)
    .single()
  const oncekiHareket = (row ?? null) as Record<string, unknown> | null
  const sicil_no = oncekiHareket?.sicil_no as string | undefined
  const yeni_kha_derece = str(formData, 'yeni_kha_derece')
  const yeni_kha_kademe = str(formData, 'yeni_kha_kademe')
  const yeni_ekea_derece = str(formData, 'yeni_ekea_derece')
  const yeni_ekea_kademe = str(formData, 'yeni_ekea_kademe')
  const yeni_kidem_yili = str(formData, 'yeni_kidem_yili')
  const yeni_kha_tarihi = tarihStr(formData, 'yeni_kha_tarihi')
  const yeni_ekea_tarihi = tarihStr(formData, 'yeni_ekea_tarihi')
  const yeni_kidem_tarihi = tarihStr(formData, 'yeni_kidem_tarihi')
  const yeni_iyi_hal_terfi_tarihi = tarihStr(formData, 'yeni_iyi_hal_terfi_tarihi')
  const yeni_oht = str(formData, 'yeni_oht')
  const yeni_yan_odeme = str(formData, 'yeni_igz')
  const yeni_ek_odeme = str(formData, 'yeni_ek_odeme')
  const yeni_ek_gosterge = str(formData, 'yeni_ek_gosterge')
  const yeni_sds_orani = str(formData, 'yeni_sds_orani')
  const kadro_sira_no = str(formData, 'kadro_sira_no')
  const yeni_gorev_yeri = str(formData, 'yeni_gorev_yeri')
  const onceki_kadro_id = Number.parseInt(String(formData.get('onceki_kadro_id') ?? ''), 10)
  const onceki_kadro_rol = String(formData.get('onceki_kadro_rol') ?? '').trim().toLowerCase() === 'vekil' ? 'vekil' : 'asil'
  const yeni_kadro_id_raw = String(formData.get('yeni_kadro_id') ?? '').trim()
  const yeni_kadro_id_parsed = yeni_kadro_id_raw ? Number.parseInt(yeni_kadro_id_raw, 10) : NaN
  const yeni_kadro_id = Number.isFinite(yeni_kadro_id_parsed) && yeni_kadro_id_parsed > 0 ? yeni_kadro_id_parsed : null
  const ayrilis_tarihi = tarihStr(formData, 'ayrilis_tarihi')
  const ayrilis_nedeni = str(formData, 'ayrilis_nedeni')
  const ayrilisHata = dogrulaAyrilisAlanlari(ayrilis_tarihi, ayrilis_nedeni)
  if (ayrilisHata) return { hata: ayrilisHata }

  const guncellemePayload = {
    hareket_tipi,
    yururluk_tarihi:       tarihStr(formData, 'yururluk_tarihi'),
    kadro_sira_no:         str(formData, 'kadro_sira_no'),
    yeni_gorev_yeri:       str(formData, 'yeni_gorev_yeri'),
    yeni_unvan:            str(formData, 'yeni_unvan'),
    yeni_sinif:            str(formData, 'yeni_sinif'),
    yeni_kadro_derecesi:   str(formData, 'yeni_kadro_derecesi'),
    yeni_kha_derece,
    yeni_kha_kademe,
    yeni_ekea_derece,
    yeni_ekea_kademe,
    yeni_kidem_yili,
    yeni_oht,
    yeni_igz:              yeni_yan_odeme,
    yeni_ek_odeme,
    yeni_ek_gosterge,
    ise_baslama_tarihi:    tarihStr(formData, 'ise_baslama_tarihi'),
    ayrilis_tarihi,
    ayrilis_nedeni,
    dayanak:               str(formData, 'dayanak'),
    aciklama:              str(formData, 'aciklama'),
    dagitim_mudurlukleri:  str(formData, 'dagitim_mudurlukleri'),
  }
  const { data: updated, error } = await supabase.from('personel_hareketleri')
    .update(guncellemePayload).eq('id', id).select('public_id').single()

  if (error) return { hata: error.message }

  if (sicil_no) {
    const degisiklikler = alanDegisiklikleriHesapla(oncekiHareket, guncellemePayload, HAREKET_ALAN_ETIKETLERI)
    if (degisiklikler.length > 0) {
      const payload = degisiklikPayload(degisiklikler)
      await writePersonelAuditLogSafe(supabase, {
        sicil_no,
        modul: 'personel',
        islem: 'Hareket Güncelle',
        ozet: degisiklikOzeti(degisiklikler, 'Personel hareketi güncellendi'),
        ref_table: 'personel_hareketleri',
        ref_id: String(id),
        onceki: payload.onceki,
        sonraki: payload.sonraki,
      })
    }
  }

  const pasif = personelPasifMi({ ayrilis_tarihi, ayrilis_nedeni })
  if (pasif && sicil_no && ayrilis_tarihi && ayrilis_nedeni) {
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
  } else {
    const kadroAtama = await kadroAtamasiniGuncelle(supabase, {
      sicil_no,
      onceki_kadro_id: Number.isFinite(onceki_kadro_id) && onceki_kadro_id > 0 ? onceki_kadro_id : null,
      onceki_kadro_rol,
      yeni_kadro_id,
    })
    if (kadroAtama.hata) return { hata: kadroAtama.hata }
    const kadroSync = await kadroMudurlukleriniEsitle(supabase, sicil_no, kadro_sira_no, yeni_gorev_yeri)
    if (kadroSync.hata) return { hata: kadroSync.hata }
  }

  if (sicil_no) {
    const terfiHata = await terfiSenkronPersonelHareketinden(supabase, sicil_no, id, {
      kha_derece: yeni_kha_derece,
      kha_kademe: yeni_kha_kademe,
      ekea_derece: yeni_ekea_derece,
      ekea_kademe: yeni_ekea_kademe,
      kha_tarihi: yeni_kha_tarihi,
      ekea_tarihi: yeni_ekea_tarihi,
      kidem_yili: yeni_kidem_yili,
      kidem_tarihi: yeni_kidem_tarihi,
      iyi_hal_terfi_tarihi: yeni_iyi_hal_terfi_tarihi,
      oht: yeni_oht,
      yan_odeme: yeni_yan_odeme,
      ek_odeme: yeni_ek_odeme,
      ek_gosterge: yeni_ek_gosterge,
      sds_orani: yeni_sds_orani,
    })
    if (terfiHata) return { hata: terfiHata }
  }

  revalidatePath('/personel-hareketleri')
  revalidatePath('/personel')
  revalidatePath('/personel/ayrilanlar')
  revalidatePath('/kadro')
  revalidatePath('/terfi/bilgiler')
  if (updated?.public_id) revalidatePath(`/link/${updated.public_id}`)
  if (sicil_no) await revalidatePersonelDetayPaths(sicil_no)
  return {}
}

/** Personel Hareketleri Değiştir: Yeni personel_hareketleri kaydı oluşturur (GAS personelHareketiKaydet karşılığı) */
export async function personelHareketiEkle(formData: FormData): Promise<{ hata?: string }> {
  const sicil_no = str(formData, 'sicil_no')
  if (!sicil_no) return { hata: 'Sicil No gerekli.' }
  const hareket_tipi = str(formData, 'hareket_tipi')
  if (!hareket_tipi) return { hata: 'Hareket Tipi seçimini tamamlayınız.' }

  const supabase = await createClient()
  const yeni_kha_derece = str(formData, 'yeni_kha_derece')
  const yeni_kha_kademe = str(formData, 'yeni_kha_kademe')
  const yeni_ekea_derece = str(formData, 'yeni_ekea_derece')
  const yeni_ekea_kademe = str(formData, 'yeni_ekea_kademe')
  const yeni_kidem_yili = str(formData, 'yeni_kidem_yili')
  const yeni_kha_tarihi = tarihStr(formData, 'yeni_kha_tarihi')
  const yeni_ekea_tarihi = tarihStr(formData, 'yeni_ekea_tarihi')
  const yeni_kidem_tarihi = tarihStr(formData, 'yeni_kidem_tarihi')
  const yeni_iyi_hal_terfi_tarihi = tarihStr(formData, 'yeni_iyi_hal_terfi_tarihi')
  const yeni_oht = str(formData, 'yeni_oht')
  const yeni_yan_odeme = str(formData, 'yeni_igz')
  const yeni_ek_odeme = str(formData, 'yeni_ek_odeme')
  const yeni_ek_gosterge = str(formData, 'yeni_ek_gosterge')
  const yeni_sds_orani = str(formData, 'yeni_sds_orani')
  const kadro_sira_no = str(formData, 'kadro_sira_no')
  const yeni_gorev_yeri = str(formData, 'yeni_gorev_yeri')
  const onceki_kadro_id = Number.parseInt(String(formData.get('onceki_kadro_id') ?? ''), 10)
  const onceki_kadro_rol = String(formData.get('onceki_kadro_rol') ?? '').trim().toLowerCase() === 'vekil' ? 'vekil' : 'asil'
  const yeni_kadro_id_raw = String(formData.get('yeni_kadro_id') ?? '').trim()
  const yeni_kadro_id_parsed = yeni_kadro_id_raw ? Number.parseInt(yeni_kadro_id_raw, 10) : NaN
  const yeni_kadro_id = Number.isFinite(yeni_kadro_id_parsed) && yeni_kadro_id_parsed > 0 ? yeni_kadro_id_parsed : null
  const ayrilis_tarihi = tarihStr(formData, 'ayrilis_tarihi')
  const ayrilis_nedeni = str(formData, 'ayrilis_nedeni')
  const ayrilisHata = dogrulaAyrilisAlanlari(ayrilis_tarihi, ayrilis_nedeni)
  if (ayrilisHata) return { hata: ayrilisHata }

  const { data: inserted, error } = await supabase.from('personel_hareketleri').insert({
    sicil_no,
    hareket_tipi,
    kadro_sira_no,
    yururluk_tarihi:                tarihStr(formData, 'yururluk_tarihi'),
    adaylik_suresi:                 str(formData, 'adaylik_suresi'),
    asli_memuriyete_atanma_tarihi:  tarihStr(formData, 'asli_memuriyete_atanma_tarihi'),
    eski_gorev_yeri:                str(formData, 'eski_gorev_yeri'),
    eski_unvan:                     str(formData, 'eski_unvan'),
    eski_sinif:                     str(formData, 'eski_sinif'),
    eski_kadro_derecesi:            str(formData, 'eski_kadro_derecesi'),
    eski_kha_derece:                str(formData, 'eski_kha_derece'),
    eski_kha_kademe:                str(formData, 'eski_kha_kademe'),
    eski_ekea_derece:               str(formData, 'eski_ekea_derece'),
    eski_ekea_kademe:               str(formData, 'eski_ekea_kademe'),
    eski_kidem_yili:                str(formData, 'eski_kidem_yili'),
    eski_oht:                       str(formData, 'eski_oht'),
    eski_igz:                       str(formData, 'eski_igz'),
    eski_ek_odeme:                  str(formData, 'eski_ek_odeme'),
    eski_ek_gosterge:               str(formData, 'eski_ek_gosterge'),
    yeni_gorev_yeri,
    yeni_unvan:                     str(formData, 'yeni_unvan'),
    yeni_sinif:                     str(formData, 'yeni_sinif'),
    yeni_kadro_derecesi:            str(formData, 'yeni_kadro_derecesi'),
    yeni_kha_derece,
    yeni_kha_kademe,
    yeni_ekea_derece,
    yeni_ekea_kademe,
    yeni_kidem_yili,
    yeni_oht,
    yeni_igz:                       yeni_yan_odeme,
    yeni_ek_odeme,
    yeni_ek_gosterge,
    dayanak:                        str(formData, 'dayanak'),
    aciklama:                       str(formData, 'aciklama'),
    teklif_eden:                    str(formData, 'teklif_eden'),
    onaylayan:                      str(formData, 'onaylayan'),
    ise_baslama_tarihi:             tarihStr(formData, 'ise_baslama_tarihi'),
    ayrilis_tarihi,
    ayrilis_nedeni,
    kayit_tarihi:                   tarihStr(formData, 'kayit_tarihi'),
    kayit_no:                       str(formData, 'kayit_no'),
    dagitim_mudurlukleri:           (formData.getAll('dagitim_mudurlukleri') as string[]).filter(Boolean).join('; ') || null,
    kayit_zamani:                   new Date().toISOString(),
  }).select('id, public_id').single()

  if (error) return { hata: error.message }

  const ayrilisOzet = ayrilis_tarihi && ayrilis_nedeni
    ? ` Ayrılış kaydedildi (${ayrilis_nedeni}, ${trTarih(ayrilis_tarihi)}).`
    : ''
  await writePersonelAuditLogSafe(supabase, {
    sicil_no,
    modul: 'personel',
    islem: 'Hareket Ekle',
    ozet: `${hareket_tipi} hareketi kaydedildi.${ayrilisOzet}`,
    ref_table: 'personel_hareketleri',
    ref_id: String(inserted?.id ?? ''),
    sonraki: {
      hareket_tipi,
      kadro_sira_no,
      yeni_gorev_yeri,
      yeni_unvan: str(formData, 'yeni_unvan'),
      yeni_sinif: str(formData, 'yeni_sinif'),
      yeni_kadro_derecesi: str(formData, 'yeni_kadro_derecesi'),
      ise_baslama_tarihi: tarihStr(formData, 'ise_baslama_tarihi'),
      ayrilis_tarihi,
      ayrilis_nedeni,
    },
  })

  const pasif = personelPasifMi({ ayrilis_tarihi, ayrilis_nedeni })
  if (pasif && ayrilis_tarihi && ayrilis_nedeni) {
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
  } else {
    const kadroAtama = await kadroAtamasiniGuncelle(supabase, {
      sicil_no,
      onceki_kadro_id: Number.isFinite(onceki_kadro_id) && onceki_kadro_id > 0 ? onceki_kadro_id : null,
      onceki_kadro_rol,
      yeni_kadro_id,
    })
    if (kadroAtama.hata) return { hata: kadroAtama.hata }
    const kadroSync = await kadroMudurlukleriniEsitle(supabase, sicil_no, kadro_sira_no, yeni_gorev_yeri)
    if (kadroSync.hata) return { hata: kadroSync.hata }
  }

  const terfiHata = await terfiSenkronPersonelHareketinden(supabase, sicil_no, inserted?.id ?? 0, {
    kha_derece: yeni_kha_derece,
    kha_kademe: yeni_kha_kademe,
    ekea_derece: yeni_ekea_derece,
    ekea_kademe: yeni_ekea_kademe,
    kha_tarihi: yeni_kha_tarihi,
    ekea_tarihi: yeni_ekea_tarihi,
    kidem_yili: yeni_kidem_yili,
    kidem_tarihi: yeni_kidem_tarihi,
    iyi_hal_terfi_tarihi: yeni_iyi_hal_terfi_tarihi,
    oht: yeni_oht,
    yan_odeme: yeni_yan_odeme,
    ek_odeme: yeni_ek_odeme,
    ek_gosterge: yeni_ek_gosterge,
    sds_orani: yeni_sds_orani,
  })
  if (terfiHata) return { hata: terfiHata }

  revalidatePath('/personel-hareketleri')
  revalidatePath('/personel')
  revalidatePath('/personel/ayrilanlar')
  revalidatePath('/kadro')
  revalidatePath('/terfi/bilgiler')
  if (inserted?.public_id) revalidatePath(`/link/${inserted.public_id}`)
  await revalidatePersonelDetayPaths(sicil_no)
  return {}
}
