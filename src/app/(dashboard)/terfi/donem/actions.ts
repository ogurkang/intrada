'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { revalidatePersonelDetayPaths } from '@/lib/revalidate-personel'
import type { Tables } from '@/types/database'
import {
  TERFI_KATSAYI_ALAN_ETIKETLERI,
  terfiAuditSnapshot,
  writeTerfiAuditLogSafe,
} from '@/lib/terfi-audit'
import {
  TERFI_DONEM_ALAN_ETIKETLERI,
  TERFI_DONEM_AUDIT_SELECT,
  donemAuditSnapshot,
  writeTerfiDonemAuditLogSafe,
} from '@/lib/terfi-donem-audit'
import { alanDegisiklikleriHesapla, degisiklikOzeti, degisiklikPayload, writePersonelAuditLogSafe } from '@/lib/personel-audit'

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? '').trim()
  return v || null
}

export async function terfiDonemEkle(fd: FormData): Promise<{ hata?: string }> {
  const yil = parseInt(String(fd.get('yil') ?? '0'), 10)
  const baslangic_tarihi = str(fd, 'baslangic_tarihi')
  const bitis_tarihi = str(fd, 'bitis_tarihi')
  if (!yil || !baslangic_tarihi || !bitis_tarihi) return { hata: 'Yıl ve tarihler zorunludur.' }
  if (bitis_tarihi < baslangic_tarihi) return { hata: 'Bitiş tarihi başlangıçtan önce olamaz.' }

  const supabase = await createClient()
  const { data: inserted, error } = await supabase
    .from('terfi_donem')
    .insert({
      yil,
      baslangic_tarihi,
      bitis_tarihi,
      sira_no: str(fd, 'sira_no'),
      donem_adi: str(fd, 'donem_adi'),
      durum: 'Açık',
    })
    .select(`id, ${TERFI_DONEM_AUDIT_SELECT}`)
    .single()

  if (error) return { hata: error.message }
  if (inserted) {
    const sonraki = donemAuditSnapshot(inserted)
    await writeTerfiDonemAuditLogSafe(supabase, {
      donemId: inserted.id,
      islem: 'Dönem Ekle',
      ozet: `Yeni terfi dönemi: ${inserted.donem_adi ?? `${inserted.yil} Dönemi`}`,
      onceki: null,
      sonraki,
    })
  }
  revalidatePath('/terfi')
  return {}
}

export async function terfiDonemGuncelle(id: number, fd: FormData): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { data: mevcut, error: mevcutErr } = await supabase
    .from('terfi_donem')
    .select(TERFI_DONEM_AUDIT_SELECT)
    .eq('id', id)
    .maybeSingle()
  if (mevcutErr) return { hata: mevcutErr.message }
  if (!mevcut) return { hata: 'Dönem bulunamadı.' }

  const oncekiSnap = donemAuditSnapshot(mevcut)
  const sonrakiSnap = donemAuditSnapshot({
    yil: parseInt(String(fd.get('yil') ?? '0'), 10),
    sira_no: str(fd, 'sira_no'),
    donem_adi: str(fd, 'donem_adi'),
    baslangic_tarihi: str(fd, 'baslangic_tarihi'),
    bitis_tarihi: str(fd, 'bitis_tarihi'),
    durum: mevcut.durum,
  })

  const { error } = await supabase
    .from('terfi_donem')
    .update({
      yil: sonrakiSnap.yil as number,
      sira_no: str(fd, 'sira_no') ?? undefined,
      donem_adi: str(fd, 'donem_adi') ?? undefined,
      baslangic_tarihi: str(fd, 'baslangic_tarihi') ?? undefined,
      bitis_tarihi: str(fd, 'bitis_tarihi') ?? undefined,
    })
    .eq('id', id)

  if (error) return { hata: error.message }

  const degisiklikler = alanDegisiklikleriHesapla(oncekiSnap, sonrakiSnap, TERFI_DONEM_ALAN_ETIKETLERI)
  if (degisiklikler.length > 0) {
    const payload = degisiklikPayload(degisiklikler)
    await writeTerfiDonemAuditLogSafe(supabase, {
      donemId: id,
      islem: 'Dönem Güncelle',
      ozet: degisiklikOzeti(degisiklikler, 'Terfi dönemi güncellendi'),
      onceki: payload.onceki,
      sonraki: payload.sonraki,
    })
  }

  revalidatePath('/terfi')
  revalidatePath(`/terfi/donem/${id}`)
  return {}
}

export async function terfiDonemKapat(id: number): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { data: mevcut, error: mevcutErr } = await supabase
    .from('terfi_donem')
    .select(TERFI_DONEM_AUDIT_SELECT)
    .eq('id', id)
    .maybeSingle()
  if (mevcutErr) return { hata: mevcutErr.message }
  if (!mevcut) return { hata: 'Dönem bulunamadı.' }

  const oncekiSnap = donemAuditSnapshot(mevcut)
  const sonrakiSnap = { ...oncekiSnap, durum: 'Kapalı' }

  const { error } = await supabase.from('terfi_donem').update({ durum: 'Kapalı' }).eq('id', id)
  if (error) return { hata: error.message }

  await writeTerfiDonemAuditLogSafe(supabase, {
    donemId: id,
    islem: 'Dönem Kapat',
    ozet: 'Terfi dönemi kapatıldı',
    onceki: oncekiSnap,
    sonraki: sonrakiSnap,
  })

  revalidatePath('/terfi')
  revalidatePath(`/terfi/donem/${id}`)
  return {}
}

export async function terfiDonemAc(id: number): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { data: mevcut, error: mevcutErr } = await supabase
    .from('terfi_donem')
    .select(TERFI_DONEM_AUDIT_SELECT)
    .eq('id', id)
    .maybeSingle()
  if (mevcutErr) return { hata: mevcutErr.message }
  if (!mevcut) return { hata: 'Dönem bulunamadı.' }

  const oncekiSnap = donemAuditSnapshot(mevcut)
  const sonrakiSnap = { ...oncekiSnap, durum: 'Açık' }

  const { error } = await supabase.from('terfi_donem').update({ durum: 'Açık' }).eq('id', id)
  if (error) return { hata: error.message }

  await writeTerfiDonemAuditLogSafe(supabase, {
    donemId: id,
    islem: 'Dönem Aç',
    ozet: 'Terfi dönemi tekrar açıldı',
    onceki: oncekiSnap,
    sonraki: sonrakiSnap,
  })

  revalidatePath('/terfi')
  revalidatePath(`/terfi/donem/${id}`)
  return {}
}

export type TerfiEttirKayitSatir = {
  terfi_id: number
  sicil_no: string
  kha_derece: string | null
  kha_kademe: string | null
  ekea_derece: string | null
  ekea_kademe: string | null
  kha_tarihi: string | null
  ekea_tarihi: string | null
  kidem_tarihi: string | null
  kidem_yili: string | null
  iyi_hal_terfi_tarihi: string | null
  ek_gosterge: string | null
  ek_odeme: string | null
  oht: string | null
  yan_odeme: string | null
  sds_orani: string | null
  /** Öğrenim terfi modalından eklenen satır */
  ogrenim_terfi?: boolean
  ogrenim_olay?: 'hazirlik' | 'yuksek_lisans' | 'doktora'
  yeni_ogrenim_turu?: string | null
}

type TerfiAlanSnapshot = {
  kha_derece: string | null
  kha_kademe: string | null
  ekea_derece: string | null
  ekea_kademe: string | null
  kha_tarihi: string | null
  ekea_tarihi: string | null
  kidem_tarihi: string | null
  kidem_yili: string | null
  iyi_hal_terfi_tarihi: string | null
  ek_gosterge: string | null
  ek_odeme: string | null
  oht: string | null
  yan_odeme: string | null
  sds_orani: string | null
}

function terfiPayload(s: TerfiEttirKayitSatir): TerfiAlanSnapshot {
  return {
    kha_derece: s.kha_derece,
    kha_kademe: s.kha_kademe,
    ekea_derece: s.ekea_derece,
    ekea_kademe: s.ekea_kademe,
    kha_tarihi: s.kha_tarihi,
    ekea_tarihi: s.ekea_tarihi,
    kidem_tarihi: s.kidem_tarihi,
    kidem_yili: s.kidem_yili,
    iyi_hal_terfi_tarihi: s.iyi_hal_terfi_tarihi,
    ek_gosterge: s.ek_gosterge,
    ek_odeme: s.ek_odeme,
    oht: s.oht,
    yan_odeme: s.yan_odeme,
    sds_orani: s.sds_orani,
  }
}

function terfiSnapshotFromRow(row: Tables<'terfi_hareketleri'>): TerfiAlanSnapshot {
  return {
    kha_derece: row.kha_derece,
    kha_kademe: row.kha_kademe,
    ekea_derece: row.ekea_derece,
    ekea_kademe: row.ekea_kademe,
    kha_tarihi: row.kha_tarihi,
    ekea_tarihi: row.ekea_tarihi,
    kidem_tarihi: row.kidem_tarihi,
    kidem_yili: row.kidem_yili,
    iyi_hal_terfi_tarihi: row.iyi_hal_terfi_tarihi,
    ek_gosterge: row.ek_gosterge,
    ek_odeme: row.ek_odeme,
    oht: row.oht,
    yan_odeme: row.yan_odeme,
    sds_orani: row.sds_orani,
  }
}

async function ogrenimTerfiKaydet(
  supabase: Awaited<ReturnType<typeof createClient>>,
  s: TerfiEttirKayitSatir,
): Promise<{ hata?: string }> {
  if (!s.ogrenim_terfi || !s.yeni_ogrenim_turu?.trim()) return {}
  if (s.ogrenim_olay !== 'yuksek_lisans' && s.ogrenim_olay !== 'doktora') return {}

  const yeniTur = s.yeni_ogrenim_turu.trim()
  const { data: mevcut } = await supabase
    .from('calisan_ogrenim')
    .select('ogrenim_turu, okul_adi, bolum, meslegi, mezuniyet_yili, mezuniyet_tarihi, varsayilan, aktif')
    .eq('sicil_no', s.sicil_no)
    .eq('aktif', true)
    .order('kayit_zamani', { ascending: false })
    .limit(1)
    .maybeSingle()

  await supabase
    .from('calisan_ogrenim')
    .update({ varsayilan: false, aktif: false })
    .eq('sicil_no', s.sicil_no)

  const payload = {
    sicil_no: s.sicil_no,
    ogrenim_turu: yeniTur,
    okul_adi: mevcut?.okul_adi ?? null,
    bolum: mevcut?.bolum ?? null,
    meslegi: mevcut?.meslegi ?? null,
    mezuniyet_yili: mevcut?.mezuniyet_yili ?? null,
    mezuniyet_tarihi: mevcut?.mezuniyet_tarihi ?? null,
    varsayilan: true,
    aktif: true,
  }
  const { data: inserted, error } = await supabase.from('calisan_ogrenim').insert(payload).select('id').single()
  if (error) return { hata: error.message }

  await writePersonelAuditLogSafe(supabase, {
    sicil_no: s.sicil_no,
    modul: 'öğrenim',
    islem: 'Terfi Öğrenim',
    ozet: `Öğrenim terfi: ${mevcut?.ogrenim_turu ?? '—'} → ${yeniTur}`,
    ref_table: 'calisan_ogrenim',
    ref_id: String(inserted?.id ?? ''),
    onceki: mevcut ?? null,
    sonraki: payload,
  })
  revalidatePath('/bildirim/ogrenim')
  return {}
}

export async function terfiEttirKaydet(
  donemId: number,
  satirlar: TerfiEttirKayitSatir[],
): Promise<{ hata?: string }> {
  if (!satirlar.length) return {}
  const supabase = await createClient()

  for (const s of satirlar) {
    const { data: onceki, error: oncekiErr } = await supabase
      .from('terfi_hareketleri')
      .select('*')
      .eq('id', s.terfi_id)
      .maybeSingle()
    if (oncekiErr) return { hata: oncekiErr.message }
    if (!onceki) return { hata: `${s.sicil_no}: terfi kaydı bulunamadı.` }

    const sonraki = terfiPayload(s)
    const { error } = await supabase
      .from('terfi_hareketleri')
      .update(sonraki)
      .eq('id', s.terfi_id)
    if (error) return { hata: error.message }

    const oncekiSnap = terfiSnapshotFromRow(onceki)
    const { error: logErr } = await supabase.from('terfi_donem_islem_log').insert({
      donem_id: donemId,
      sicil_no: s.sicil_no,
      terfi_id: s.terfi_id,
      onceki: oncekiSnap,
      sonraki,
      geri_alindi: false,
    })
    if (logErr) return { hata: logErr.message }

    const degisiklikler = alanDegisiklikleriHesapla(oncekiSnap, sonraki, TERFI_KATSAYI_ALAN_ETIKETLERI)
    if (degisiklikler.length > 0) {
      const payload = degisiklikPayload(degisiklikler)
      const ozet = degisiklikOzeti(degisiklikler, `Terfi ettirildi (dönem #${donemId})`)
      await writeTerfiAuditLogSafe(supabase, {
        sicil_no: s.sicil_no,
        terfiId: s.terfi_id,
        islem: 'Terfi Ettir',
        ozet,
        onceki: payload.onceki,
        sonraki: payload.sonraki,
      })
      await writeTerfiDonemAuditLogSafe(supabase, {
        donemId,
        sicil_no: s.sicil_no,
        islem: 'Terfi Ettir',
        ozet,
        onceki: payload.onceki,
        sonraki: payload.sonraki,
      })
    }

    const ogRes = await ogrenimTerfiKaydet(supabase, s)
    if (ogRes.hata) return ogRes
  }

  revalidatePath('/terfi')
  revalidatePath('/terfi/bilgiler')
  revalidatePath(`/terfi/donem/${donemId}`)
  const siciller = [...new Set(satirlar.map((x) => x.sicil_no))]
  for (const sicil of siciller) {
    await revalidatePersonelDetayPaths(sicil)
  }
  return {}
}

async function revalidateTerfiDonemBaglantili(donemId: number, sicilNo: string[]) {
  revalidatePath('/terfi')
  revalidatePath('/terfi/bilgiler')
  revalidatePath(`/terfi/donem/${donemId}`)
  for (const sicil of new Set(sicilNo)) {
    await revalidatePersonelDetayPaths(sicil)
  }
}

export async function terfiGeriAlTek(
  donemId: number,
  logId: number,
): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { data: logRow, error: logErr } = await supabase
    .from('terfi_donem_islem_log')
    .select('*')
    .eq('id', logId)
    .eq('donem_id', donemId)
    .maybeSingle()
  if (logErr) return { hata: logErr.message }
  if (!logRow) return { hata: 'Terfi işlem logu bulunamadı.' }
  if (logRow.geri_alindi) return { hata: 'Bu kayıt daha önce geri alınmış.' }

  const geriYukle = (logRow.onceki ?? {}) as TerfiAlanSnapshot
  const { data: guncel } = await supabase
    .from('terfi_hareketleri')
    .select('*')
    .eq('id', logRow.terfi_id)
    .maybeSingle()
  const oncekiSnap = terfiAuditSnapshot(guncel ?? {}, TERFI_KATSAYI_ALAN_ETIKETLERI)
  const sonrakiSnap = terfiAuditSnapshot(geriYukle, TERFI_KATSAYI_ALAN_ETIKETLERI)

  const { error: upErr } = await supabase
    .from('terfi_hareketleri')
    .update(geriYukle)
    .eq('id', logRow.terfi_id)
  if (upErr) return { hata: upErr.message }

  const degisiklikler = alanDegisiklikleriHesapla(oncekiSnap, sonrakiSnap, TERFI_KATSAYI_ALAN_ETIKETLERI)
  if (degisiklikler.length > 0) {
    const payload = degisiklikPayload(degisiklikler)
    const ozet = degisiklikOzeti(degisiklikler, `Terfi geri alındı (dönem #${donemId})`)
    await writeTerfiAuditLogSafe(supabase, {
      sicil_no: logRow.sicil_no,
      terfiId: logRow.terfi_id,
      islem: 'Terfi Geri Al',
      ozet,
      onceki: payload.onceki,
      sonraki: payload.sonraki,
    })
    await writeTerfiDonemAuditLogSafe(supabase, {
      donemId,
      sicil_no: logRow.sicil_no,
      islem: 'Terfi Geri Al',
      ozet,
      onceki: payload.onceki,
      sonraki: payload.sonraki,
    })
  }

  const { error: markErr } = await supabase
    .from('terfi_donem_islem_log')
    .update({
      geri_alindi: true,
      geri_alma_tarihi: new Date().toISOString(),
    })
    .eq('id', logId)
  if (markErr) return { hata: markErr.message }

  await revalidateTerfiDonemBaglantili(donemId, [logRow.sicil_no])
  return {}
}

export async function terfiGeriAlToplu(
  donemId: number,
  logIds: number[],
): Promise<{ hata?: string; geriAlinan?: number }> {
  if (!logIds.length) return { geriAlinan: 0 }
  const supabase = await createClient()
  const { data: rows, error } = await supabase
    .from('terfi_donem_islem_log')
    .select('*')
    .eq('donem_id', donemId)
    .in('id', logIds)
    .eq('geri_alindi', false)
  if (error) return { hata: error.message }
  const logs = rows ?? []
  if (!logs.length) return { geriAlinan: 0 }

  const siciller: string[] = []
  for (const logRow of logs) {
    const geriYukle = (logRow.onceki ?? {}) as TerfiAlanSnapshot
    const { data: guncel } = await supabase
      .from('terfi_hareketleri')
      .select('*')
      .eq('id', logRow.terfi_id)
      .maybeSingle()
    const oncekiSnap = terfiAuditSnapshot(guncel ?? {}, TERFI_KATSAYI_ALAN_ETIKETLERI)
    const sonrakiSnap = terfiAuditSnapshot(geriYukle, TERFI_KATSAYI_ALAN_ETIKETLERI)

    const { error: upErr } = await supabase
      .from('terfi_hareketleri')
      .update(geriYukle)
      .eq('id', logRow.terfi_id)
    if (upErr) return { hata: upErr.message }

    const degisiklikler = alanDegisiklikleriHesapla(oncekiSnap, sonrakiSnap, TERFI_KATSAYI_ALAN_ETIKETLERI)
    if (degisiklikler.length > 0) {
      const payload = degisiklikPayload(degisiklikler)
      const ozet = degisiklikOzeti(degisiklikler, `Terfi geri alındı (dönem #${donemId}, toplu)`)
      await writeTerfiAuditLogSafe(supabase, {
        sicil_no: logRow.sicil_no,
        terfiId: logRow.terfi_id,
        islem: 'Terfi Geri Al',
        ozet,
        onceki: payload.onceki,
        sonraki: payload.sonraki,
      })
      await writeTerfiDonemAuditLogSafe(supabase, {
        donemId,
        sicil_no: logRow.sicil_no,
        islem: 'Terfi Geri Al',
        ozet,
        onceki: payload.onceki,
        sonraki: payload.sonraki,
      })
    }
    siciller.push(logRow.sicil_no)
  }

  const { error: markErr } = await supabase
    .from('terfi_donem_islem_log')
    .update({ geri_alindi: true, geri_alma_tarihi: new Date().toISOString() })
    .in('id', logs.map(l => l.id))
  if (markErr) return { hata: markErr.message }

  await revalidateTerfiDonemBaglantili(donemId, siciller)
  return { geriAlinan: logs.length }
}
