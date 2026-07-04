'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { revalidatePersonelDetayPaths } from '@/lib/revalidate-personel'
import { revalidateTerfiRoutes } from '@/lib/terfi-app-path'
import {
  TERFI_ALAN_ETIKETLERI,
  TERFI_AUDIT_SELECT,
  TERFI_AUDIT_SELECT_FULL,
  TERFI_KATSAYI_ALAN_ETIKETLERI,
  terfiAuditSnapshot,
  writeTerfiAuditLogSafe,
} from '@/lib/terfi-audit'
import {
  alanDegisiklikleriHesapla,
  degisiklikOzeti,
  degisiklikPayload,
} from '@/lib/personel-audit'

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? '').trim()
  return v || null
}

export async function terfiEkle(fd: FormData): Promise<{ hata?: string }> {
  const sicil_no = str(fd, 'sicil_no')
  if (!sicil_no) return { hata: 'Sicil no zorunludur.' }

  const supabase = await createClient()
  const insertPayload = {
    sicil_no,
    ad_soyad:               str(fd, 'ad_soyad'),
    rol:                    str(fd, 'rol'),
    kadro_id: (() => {
      const n = Number.parseInt(String(fd.get('kadro_id') ?? ''), 10)
      return Number.isFinite(n) && n > 0 ? n : null
    })(),
    kadro_sira_no:          str(fd, 'kadro_sira_no'),
    unvan:                  str(fd, 'unvan'),
    mudurluk:               str(fd, 'mudurluk'),
    gorev_ayligi_derece:    str(fd, 'gorev_ayligi_derece'),
    gorev_ayligi_kademe:    str(fd, 'gorev_ayligi_kademe'),
    kha_derece:             str(fd, 'kha_derece'),
    kha_kademe:             str(fd, 'kha_kademe'),
    kha_tarihi:             str(fd, 'kha_tarihi'),
    ekea_derece:            str(fd, 'ekea_derece'),
    ekea_kademe:            str(fd, 'ekea_kademe'),
    ekea_tarihi:            str(fd, 'ekea_tarihi'),
    kidem_yili:             str(fd, 'kidem_yili'),
    kidem_tarihi:           str(fd, 'kidem_tarihi'),
    iyi_hal_terfi_tarihi:   str(fd, 'iyi_hal_terfi_tarihi'),
    ek_gosterge:            str(fd, 'ek_gosterge'),
    ek_odeme:               str(fd, 'ek_odeme'),
    oht:                    str(fd, 'oht'),
    yan_odeme:              str(fd, 'yan_odeme'),
    sds_orani:              str(fd, 'sds_orani'),
  }
  const { data: inserted, error } = await supabase
    .from('terfi_hareketleri')
    .insert(insertPayload)
    .select('id')
    .single()
  if (error) return { hata: error.message }

  if (inserted?.id) {
    await writeTerfiAuditLogSafe(supabase, {
      sicil_no,
      terfiId: inserted.id,
      islem: 'Ekle',
      ozet: `Terfi kaydı oluşturuldu (sicil ${sicil_no}).`,
      sonraki: terfiAuditSnapshot(insertPayload, TERFI_ALAN_ETIKETLERI),
    })
  }

  revalidateTerfiRoutes()
  revalidatePath(`/personel/${sicil_no}`)
  return {}
}

export async function terfiGuncelle(id: number, fd: FormData): Promise<{ hata?: string }> {
  const sicil_no = str(fd, 'sicil_no')
  if (!sicil_no) return { hata: 'Sicil no zorunludur.' }

  const supabase = await createClient()
  const { data: mevcut } = await supabase
    .from('terfi_hareketleri')
    .select(TERFI_AUDIT_SELECT)
    .eq('id', id)
    .maybeSingle()

  const guncelleme = {
    gorev_ayligi_derece:    str(fd, 'gorev_ayligi_derece'),
    gorev_ayligi_kademe:    str(fd, 'gorev_ayligi_kademe'),
    kha_derece:             str(fd, 'kha_derece'),
    kha_kademe:             str(fd, 'kha_kademe'),
    kha_tarihi:             str(fd, 'kha_tarihi'),
    ekea_derece:            str(fd, 'ekea_derece'),
    ekea_kademe:            str(fd, 'ekea_kademe'),
    ekea_tarihi:            str(fd, 'ekea_tarihi'),
    kidem_yili:             str(fd, 'kidem_yili'),
    kidem_tarihi:           str(fd, 'kidem_tarihi'),
    iyi_hal_terfi_tarihi:   str(fd, 'iyi_hal_terfi_tarihi'),
    ek_gosterge:            str(fd, 'ek_gosterge'),
    ek_odeme:               str(fd, 'ek_odeme'),
    oht:                    str(fd, 'oht'),
    yan_odeme:              str(fd, 'yan_odeme'),
    sds_orani:              str(fd, 'sds_orani'),
  }

  const { error } = await supabase.from('terfi_hareketleri').update(guncelleme).eq('id', id)
  if (error) return { hata: error.message }

  const oncekiSnap = terfiAuditSnapshot(mevcut ?? {}, TERFI_KATSAYI_ALAN_ETIKETLERI)
  const sonrakiSnap = terfiAuditSnapshot({ ...mevcut, ...guncelleme }, TERFI_KATSAYI_ALAN_ETIKETLERI)
  const degisiklikler = alanDegisiklikleriHesapla(oncekiSnap, sonrakiSnap, TERFI_KATSAYI_ALAN_ETIKETLERI)
  if (degisiklikler.length > 0) {
    const payload = degisiklikPayload(degisiklikler)
    await writeTerfiAuditLogSafe(supabase, {
      sicil_no,
      terfiId: id,
      islem: 'Güncelle',
      ozet: degisiklikOzeti(degisiklikler, 'Terfi kaydı güncellendi'),
      onceki: payload.onceki,
      sonraki: payload.sonraki,
    })
  }

  revalidateTerfiRoutes()
  await revalidatePersonelDetayPaths(sicil_no)
  return {}
}

export async function terfiSil(id: number, sicil_no: string): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { data: mevcut } = await supabase
    .from('terfi_hareketleri')
    .select(TERFI_AUDIT_SELECT_FULL)
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase.from('terfi_hareketleri').delete().eq('id', id)
  if (error) return { hata: error.message }

  if (mevcut) {
    await writeTerfiAuditLogSafe(supabase, {
      sicil_no,
      terfiId: id,
      islem: 'Sil',
      ozet: `Terfi kaydı silindi (sicil ${sicil_no}).`,
      onceki: terfiAuditSnapshot(mevcut, TERFI_ALAN_ETIKETLERI),
    })
  }

  revalidateTerfiRoutes()
  await revalidatePersonelDetayPaths(sicil_no)
  return {}
}

export interface TerfiSatir {
  /** Mevcut terfi satırı varsa güncelleme; yoksa yeni insert. */
  id?: number | null
  sicil_no:             string
  ad_soyad:             string | null
  rol?:                 string | null
  kadro_id?:            number | null
  kadro_sira_no?:       string | null
  gorev_ayligi_derece:  string | null
  gorev_ayligi_kademe:  string | null
  kha_derece:           string | null
  kha_kademe:           string | null
  kha_tarihi:           string | null
  ekea_derece:          string | null
  ekea_kademe:          string | null
  ekea_tarihi:          string | null
  kidem_yili:           string | null
  kidem_tarihi:         string | null
  iyi_hal_terfi_tarihi: string | null
  ek_gosterge:          string | null
  ek_odeme:             string | null
  oht:                  string | null
  yan_odeme:            string | null
  sds_orani:            string | null
}

function terfiKatsayiPayload(s: TerfiSatir) {
  return {
    gorev_ayligi_derece: s.gorev_ayligi_derece,
    gorev_ayligi_kademe: s.gorev_ayligi_kademe,
    kha_derece: s.kha_derece,
    kha_kademe: s.kha_kademe,
    kha_tarihi: s.kha_tarihi,
    ekea_derece: s.ekea_derece,
    ekea_kademe: s.ekea_kademe,
    ekea_tarihi: s.ekea_tarihi,
    kidem_yili: s.kidem_yili,
    kidem_tarihi: s.kidem_tarihi,
    iyi_hal_terfi_tarihi: s.iyi_hal_terfi_tarihi,
    ek_gosterge: s.ek_gosterge,
    ek_odeme: s.ek_odeme,
    oht: s.oht,
    yan_odeme: s.yan_odeme,
    sds_orani: s.sds_orani,
    ad_soyad: s.ad_soyad,
  }
}

/** Tabloda sicil_no UNIQUE değil; upsert(onConflict: sicil_no) Postgres hatası verir. Güncelleme id ile, yoksa insert. */
export async function terfiTopluKaydet(
  satirlar: TerfiSatir[]
): Promise<{ hata?: string; kaydedilen?: number }> {
  if (!satirlar.length) return { kaydedilen: 0 }
  const supabase = await createClient()

  const guncellenecekIdler = satirlar
    .map(s => (s.id != null && Number.isFinite(s.id) ? s.id! : null))
    .filter((id): id is number => id != null)
  const mevcutById = new Map<number, Record<string, unknown>>()
  if (guncellenecekIdler.length > 0) {
    const { data: mevcutRows, error: selErr } = await supabase
      .from('terfi_hareketleri')
      .select(`id, ${TERFI_AUDIT_SELECT}`)
      .in('id', guncellenecekIdler)
    if (selErr) return { hata: selErr.message }
    for (const r of mevcutRows ?? []) {
      mevcutById.set(r.id, r as Record<string, unknown>)
    }
  }

  for (const s of satirlar) {
    const id = s.id != null && Number.isFinite(s.id) ? s.id : null
    const payload = terfiKatsayiPayload(s)
    if (id != null) {
      const oncekiSnap = terfiAuditSnapshot(mevcutById.get(id) ?? {}, TERFI_KATSAYI_ALAN_ETIKETLERI)
      const sonrakiSnap = terfiAuditSnapshot({ ...mevcutById.get(id), ...payload }, TERFI_KATSAYI_ALAN_ETIKETLERI)
      const { error } = await supabase.from('terfi_hareketleri').update(payload).eq('id', id)
      if (error) return { hata: error.message }
      const degisiklikler = alanDegisiklikleriHesapla(oncekiSnap, sonrakiSnap, TERFI_KATSAYI_ALAN_ETIKETLERI)
      if (degisiklikler.length > 0) {
        const diff = degisiklikPayload(degisiklikler)
        await writeTerfiAuditLogSafe(supabase, {
          sicil_no: s.sicil_no,
          terfiId: id,
          islem: 'Güncelle',
          ozet: degisiklikOzeti(degisiklikler, 'Terfi toplu güncelleme'),
          onceki: diff.onceki,
          sonraki: diff.sonraki,
        })
      }
    } else {
      const { data: inserted, error } = await supabase
        .from('terfi_hareketleri')
        .insert({
          sicil_no: s.sicil_no,
          rol: s.rol ?? null,
          kadro_id: s.kadro_id ?? null,
          kadro_sira_no: s.kadro_sira_no ?? null,
          unvan: null,
          mudurluk: null,
          ...payload,
        })
        .select('id')
        .single()
      if (error) return { hata: error.message }
      if (inserted?.id) {
        await writeTerfiAuditLogSafe(supabase, {
          sicil_no: s.sicil_no,
          terfiId: inserted.id,
          islem: 'Ekle',
          ozet: `Terfi toplu kayıt ile oluşturuldu (sicil ${s.sicil_no}).`,
          sonraki: terfiAuditSnapshot({ ...payload, sicil_no: s.sicil_no }, TERFI_KATSAYI_ALAN_ETIKETLERI),
        })
      }
    }
  }

  revalidateTerfiRoutes()
  const siciller = [...new Set(satirlar.map(s => s.sicil_no))]
  for (const sicil of siciller) {
    await revalidatePersonelDetayPaths(sicil)
  }
  return { kaydedilen: satirlar.length }
}

/** Eşleşmemiş terfi kaydını seçilen kadro hareketine bağlar */
export async function terfiKadroyaBagla(
  terfiId: number,
  kadroId: number,
): Promise<{ hata?: string }> {
  const id = Number(terfiId)
  const khId = Number(kadroId)
  if (!Number.isFinite(id) || id <= 0) return { hata: 'Geçersiz terfi kaydı.' }
  if (!Number.isFinite(khId) || khId <= 0) return { hata: 'Kadro seçimi zorunludur.' }

  const supabase = await createClient()

  const { data: terfi, error: terfiErr } = await supabase
    .from('terfi_hareketleri')
    .select('id, sicil_no, ad_soyad, kadro_id, rol, kadro_sira_no')
    .eq('id', id)
    .maybeSingle()
  if (terfiErr) return { hata: terfiErr.message }
  if (!terfi) return { hata: 'Terfi kaydı bulunamadı.' }

  const { data: kh, error: khErr } = await supabase
    .from('kadro_hareketleri')
    .select('id, asil, vekil, kadro_sira_no, kadro_unvani, ayrilis_tarihi')
    .eq('id', khId)
    .maybeSingle()
  if (khErr) return { hata: khErr.message }
  if (!kh) return { hata: 'Kadro kaydı bulunamadı.' }

  const sicil = String(terfi.sicil_no ?? '').trim()
  let rol: 'Asil' | 'Vekil' | null = null
  if ((kh.asil ?? '').trim() === sicil) rol = 'Asil'
  else if ((kh.vekil ?? '').trim() === sicil) rol = 'Vekil'
  if (!rol) return { hata: 'Seçilen kadro bu personelin sicil no\'su ile eşleşmiyor.' }

  const { data: baskaTerfi } = await supabase
    .from('terfi_hareketleri')
    .select('id')
    .eq('kadro_id', khId)
    .neq('id', id)
    .maybeSingle()
  if (baskaTerfi?.id) {
    return { hata: `Bu kadro zaten ${baskaTerfi.id} numaralı terfi kaydına bağlı.` }
  }

  const guncelleme = {
    kadro_id: khId,
    rol,
    kadro_sira_no: kh.kadro_sira_no ?? null,
  }

  const { error: updErr } = await supabase
    .from('terfi_hareketleri')
    .update(guncelleme)
    .eq('id', id)
  if (updErr) return { hata: updErr.message }

  await writeTerfiAuditLogSafe(supabase, {
    sicil_no: sicil,
    terfiId: id,
    islem: 'Kadro Bağla',
    ozet: `Terfi kaydı kadro #${khId} (${rol}, sıra ${kh.kadro_sira_no ?? '—'}) ile eşleştirildi.`,
    onceki: terfiAuditSnapshot(terfi, TERFI_ALAN_ETIKETLERI),
    sonraki: terfiAuditSnapshot({ ...terfi, ...guncelleme }, TERFI_ALAN_ETIKETLERI),
  })

  revalidateTerfiRoutes()
  await revalidatePersonelDetayPaths(sicil)
  return {}
}

/** Geçmiş/ayrılmış eşleşmemiş terfi kaydını listeden çıkarır (silmez) */
export async function terfiKapsamDisiYap(
  terfiId: number,
  sicil_no: string,
): Promise<{ hata?: string }> {
  const id = Number(terfiId)
  if (!Number.isFinite(id) || id <= 0) return { hata: 'Geçersiz terfi kaydı.' }
  const sicil = String(sicil_no ?? '').trim()
  if (!sicil) return { hata: 'Sicil no gerekli.' }

  const supabase = await createClient()
  const { data: mevcut, error: selErr } = await supabase
    .from('terfi_hareketleri')
    .select('id, sicil_no, ad_soyad, kadro_id, kapsam_disi')
    .eq('id', id)
    .maybeSingle()
  if (selErr) return { hata: selErr.message }
  if (!mevcut) return { hata: 'Terfi kaydı bulunamadı.' }
  if (mevcut.sicil_no !== sicil) return { hata: 'Sicil no uyuşmuyor.' }
  if (mevcut.kadro_id != null) return { hata: 'Kadroya bağlı kayıt kapsam dışı yapılamaz.' }
  if (mevcut.kapsam_disi) return {}

  const { error: updErr } = await supabase
    .from('terfi_hareketleri')
    .update({ kapsam_disi: true })
    .eq('id', id)
  if (updErr) return { hata: updErr.message }

  await writeTerfiAuditLogSafe(supabase, {
    sicil_no: sicil,
    terfiId: id,
    islem: 'Kapsam Dışı',
    ozet: `Terfi kaydı geçmiş/ayrılmış kayıt olarak işaretlendi (T#${id}).`,
    onceki: terfiAuditSnapshot(mevcut, TERFI_ALAN_ETIKETLERI),
    sonraki: terfiAuditSnapshot({ ...mevcut, kapsam_disi: true }, TERFI_ALAN_ETIKETLERI),
  })

  revalidateTerfiRoutes()
  await revalidatePersonelDetayPaths(sicil)
  return {}
}
