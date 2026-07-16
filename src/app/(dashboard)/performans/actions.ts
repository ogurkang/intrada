'use server'

import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { revalidatePath } from 'next/cache'
import {
  performansKriterKodlari,
  performansOrtalamaYuvarla,
  type PerformansFormTipi,
} from '@/lib/performans'
import { performansAmirEsle, type OrgBirimSatir } from '@/lib/performans-amir'
import {
  kadroMudurlukIndeksi,
  mudurlukByNormHaritasi,
  performansKadroUygun,
  performansMudurlukCoz,
} from '@/lib/performans-kadro'
import { sablonDoldur } from '@/lib/sms-sablon'
import { fetchSmsAyar, smsAyarHazirMi, smsAyarToConfig } from '@/lib/sms-ayar'
import { smsGonderTekMetin } from '@/lib/sms-mesajpaketi'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sb = any

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, hata: 'Oturum gerekli.' as const }
  const access = await getAppAccess(supabase, user.id)
  if (!isAdminLike(access)) return { supabase, hata: 'Bu işlem için yetkiniz yok.' as const }
  return { supabase, hata: null as null, user, access }
}

async function currentSicil(supabase: Sb): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const access = await getAppAccess(supabase, user.id)
  if (access.mode === 'kullanici') return access.sicilNo
  if (isAdminLike(access)) {
    const { data } = await supabase.from('app_profiles').select('sicil_no').eq('id', user.id).maybeSingle()
    return data?.sicil_no ? String(data.sicil_no) : null
  }
  return null
}

/** Açık döneme memur kadrolarını üret / eksikleri tamamla */
export async function performansDonemPersonelSeedle(donemId: number): Promise<{ hata?: string; eklenen?: number }> {
  const gate = await requireAdmin()
  if (gate.hata) return { hata: gate.hata }
  const { supabase } = gate

  const { data: kriterler } = await (supabase as Sb)
    .from('performans_kriter')
    .select('id, kod')
    .eq('aktif', true)
  const kriterByKod = new Map<number, number>((kriterler ?? []).map((k: { id: number; kod: number }) => [k.kod, k.id]))

  const { data: aktifOrg } = await (supabase as Sb)
    .from('tanim_organizasyon')
    .select('id')
    .eq('aktif', true)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: birimRaw } = aktifOrg?.id
    ? await (supabase as Sb)
        .from('tanim_organizasyon_birim')
        .select('id, birim_turu, mudurluk_id, personel_sicil_no, ust_birim_id, mudurluk:tanim_mudurluk(id, mudurluk_adi)')
        .eq('organizasyon_id', aktifOrg.id)
    : { data: [] }
  const birimler = (birimRaw ?? []) as OrgBirimSatir[]

  const { data: mudRaw } = await supabase
    .from('tanim_mudurluk')
    .select('mudurluk_adi')
    .eq('aktif', true)
  const mudurlukByNorm = mudurlukByNormHaritasi(
    (mudRaw ?? []).map(m => m.mudurluk_adi).filter(Boolean) as string[],
  )

  const { data: kadroRows } = await supabase
    .from('kadro_hareketleri')
    .select('durumu, statu, kadro_unvani, gorev_unvani, gorev_mudurlugu, asil, vekil, kadro_mudurlugu, asil_calisan:calisan!kadro_hareketleri_asil_fkey(ad_soyad), vekil_calisan:calisan!kadro_hareketleri_vekil_fkey(ad_soyad)')
    .is('ayrilis_tarihi', null)

  type Kadro = {
    durumu?: string | null
    statu?: string | null
    kadro_unvani?: string | null
    gorev_unvani?: string | null
    gorev_mudurlugu?: string | null
    asil?: string | null
    vekil?: string | null
    kadro_mudurlugu?: string | null
    asil_calisan?: { ad_soyad: string | null } | null
    vekil_calisan?: { ad_soyad: string | null } | null
  }
  const kadrolar = (kadroRows ?? []).filter(k => performansKadroUygun(k)) as Kadro[]

  const { data: mevcut } = await (supabase as Sb)
    .from('performans_degerlendirme')
    .select('sicil_no')
    .eq('donem_id', donemId)
  const mevcutSet = new Set((mevcut ?? []).map((m: { sicil_no: string }) => m.sicil_no))

  const eklenecek: {
    donem_id: number
    sicil_no: string
    mudurluk_adi: string | null
    form_tipi: PerformansFormTipi
    amir1_sicil: string | null
    amir2_sicil: string | null
    tek_amir: boolean
    durum: string
  }[] = []

  const gorulen = new Set<string>()
  for (const k of kadrolar) {
    const sicil = String(k.asil ?? '').trim() || String(k.vekil ?? '').trim()
    if (!sicil || gorulen.has(sicil) || mevcutSet.has(sicil)) continue
    gorulen.add(sicil)

    const unvan = k.gorev_unvani || k.kadro_unvani
    const mudurlukAdi = performansMudurlukCoz(k, mudurlukByNorm)
    const esleme = performansAmirEsle({
      sicilNo: sicil,
      unvan,
      mudurlukAdi,
      birimler,
      kadroRows: kadrolar,
    })

    eklenecek.push({
      donem_id: donemId,
      sicil_no: sicil,
      mudurluk_adi: mudurlukAdi,
      form_tipi: esleme.formTipi,
      amir1_sicil: esleme.amir1_sicil,
      amir2_sicil: esleme.tek_amir ? null : esleme.amir2_sicil,
      tek_amir: esleme.tek_amir,
      durum: 'beklemede_1',
    })
  }

  // Mevcut kayıtlarda müdürlük boşsa kadrodan güncelle
  if (mevcutSet.size > 0) {
    const { data: mevcutRows } = await (supabase as Sb)
      .from('performans_degerlendirme')
      .select('id, sicil_no, mudurluk_adi')
      .eq('donem_id', donemId)
    const kadroMudMap = new Map<string, string | null>()
    for (const k of kadrolar) {
      const sicil = String(k.asil ?? '').trim() || String(k.vekil ?? '').trim()
      if (sicil) kadroMudMap.set(sicil, performansMudurlukCoz(k, mudurlukByNorm))
    }
    for (const row of mevcutRows ?? []) {
      const mud = kadroMudMap.get(row.sicil_no)
      if (!mud) continue
      if (row.mudurluk_adi === mud) continue
      await (supabase as Sb)
        .from('performans_degerlendirme')
        .update({ mudurluk_adi: mud })
        .eq('id', row.id)
    }
  }

  if (eklenecek.length === 0) {
    revalidatePath('/performans/donem')
    revalidatePath('/performans/degerlendirme')
    return { eklenen: 0 }
  }

  const { data: inserted, error } = await (supabase as Sb)
    .from('performans_degerlendirme')
    .insert(eklenecek)
    .select('id, form_tipi')
  if (error) return { hata: error.message }

  const puanRows: { degerlendirme_id: number; kriter_id: number }[] = []
  for (const row of inserted ?? []) {
    const kodlar = performansKriterKodlari(row.form_tipi as PerformansFormTipi)
    for (const kod of kodlar) {
      const kid = kriterByKod.get(kod)
      if (kid) puanRows.push({ degerlendirme_id: row.id, kriter_id: kid })
    }
  }
  if (puanRows.length > 0) {
    const { error: pErr } = await (supabase as Sb).from('performans_puan').insert(puanRows)
    if (pErr) return { hata: pErr.message }
  }

  revalidatePath('/performans/donem')
  revalidatePath('/performans/degerlendirme')
  return { eklenen: eklenecek.length }
}

export async function performansDonemYayinla(donemId: number): Promise<{ hata?: string }> {
  const gate = await requireAdmin()
  if (gate.hata) return { hata: gate.hata }
  const { supabase } = gate

  const { count } = await (supabase as Sb)
    .from('performans_degerlendirme')
    .select('id', { count: 'exact', head: true })
    .eq('donem_id', donemId)
    .not('durum', 'in', '("amir2_onay","tamamlandi")')

  // tek amir tamamlandi da sayılır; incomplete check
  const { data: incomplete } = await (supabase as Sb)
    .from('performans_degerlendirme')
    .select('id, durum, tek_amir')
    .eq('donem_id', donemId)
  const pending = (incomplete ?? []).filter((r: { durum: string; tek_amir: boolean }) => {
    if (r.durum === 'amir2_onay' || r.durum === 'tamamlandi') return false
    return true
  })
  if (pending.length > 0) {
    return { hata: `Henüz tamamlanmamış ${pending.length} değerlendirme var. Yayınlanamaz.` }
  }

  await (supabase as Sb)
    .from('performans_degerlendirme')
    .update({ durum: 'tamamlandi', updated_at: new Date().toISOString() })
    .eq('donem_id', donemId)
    .eq('durum', 'amir2_onay')

  const { error } = await (supabase as Sb)
    .from('performans_donem')
    .update({ durum: 'Yayınlandı', updated_at: new Date().toISOString() })
    .eq('id', donemId)
  if (error) return { hata: error.message }

  void count
  revalidatePath('/performans/donem')
  revalidatePath('/performans/degerlendirme')
  revalidatePath('/personel')
  return {}
}

export async function performansSmsAyarKaydet(metin: string): Promise<{ hata?: string }> {
  const gate = await requireAdmin()
  if (gate.hata) return { hata: gate.hata }
  const { error } = await (gate.supabase as Sb)
    .from('performans_sms_ayar')
    .upsert({ id: 1, metin: metin.trim(), updated_at: new Date().toISOString() })
  if (error) return { hata: error.message }
  revalidatePath('/performans/tanimlar')
  return {}
}

export async function performansKriterGuncelle(
  id: number,
  patch: { baslik?: string; aciklama?: string | null; aktif?: boolean },
): Promise<{ hata?: string }> {
  const gate = await requireAdmin()
  if (gate.hata) return { hata: gate.hata }
  const { error } = await (gate.supabase as Sb)
    .from('performans_kriter')
    .update(patch)
    .eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath('/performans/tanimlar')
  return {}
}

export async function performansAmir1Kaydet(params: {
  degerlendirmeId: number
  puanlar: Record<number, number> // kriter_id → 1..5
  gonder: boolean
}): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const sicil = await currentSicil(supabase)
  if (!sicil) return { hata: 'Sicil bulunamadı.' }

  const { data: deg } = await (supabase as Sb)
    .from('performans_degerlendirme')
    .select('*, donem:performans_donem(id, durum, yil)')
    .eq('id', params.degerlendirmeId)
    .maybeSingle()
  if (!deg) return { hata: 'Kayıt bulunamadı.' }
  if (deg.donem?.durum === 'Yayınlandı' || deg.donem?.durum === 'Kapalı') {
    return { hata: 'Dönem kapalı / yayınlandı.' }
  }

  const access = await getAppAccess(supabase, (await supabase.auth.getUser()).data.user!.id)
  const isAdmin = isAdminLike(access)
  if (!isAdmin && deg.amir1_sicil !== sicil) return { hata: '1. amir yetkiniz yok.' }
  if (!['beklemede_1', 'iade'].includes(deg.durum)) {
    return { hata: 'Bu kayıt 1. amir tarafından düzenlenemez.' }
  }

  for (const [kriterId, puan] of Object.entries(params.puanlar)) {
    const p = Number(puan)
    if (!Number.isFinite(p) || p < 1 || p > 5) continue
    const { error } = await (supabase as Sb)
      .from('performans_puan')
      .update({ puan_amir1: p })
      .eq('degerlendirme_id', params.degerlendirmeId)
      .eq('kriter_id', Number(kriterId))
    if (error) return { hata: error.message }
  }

  const { data: puanRows } = await (supabase as Sb)
    .from('performans_puan')
    .select('puan_amir1')
    .eq('degerlendirme_id', params.degerlendirmeId)
  const values = (puanRows ?? []).map((r: { puan_amir1: number | null }) => r.puan_amir1)
  if (params.gonder && values.some((v: number | null) => v == null)) {
    return { hata: 'Tüm kriterler puanlanmadan gönderilemez.' }
  }
  const toplam = values.reduce((s: number, v: number | null) => s + (v ?? 0), 0)

  const patch: Record<string, unknown> = {
    puan_amir1: toplam,
    updated_at: new Date().toISOString(),
  }

  if (params.gonder) {
    if (deg.tek_amir) {
      patch.durum = 'tamamlandi'
      patch.puan_amir2 = toplam
      patch.ortalama = toplam
      patch.amir1_tamam_at = new Date().toISOString()
      patch.amir2_onay_at = new Date().toISOString()
    } else {
      // 2. amir başlangıçta 1. puanları görsün
      for (const [kriterId, puan] of Object.entries(params.puanlar)) {
        await (supabase as Sb)
          .from('performans_puan')
          .update({ puan_amir2: Number(puan) })
          .eq('degerlendirme_id', params.degerlendirmeId)
          .eq('kriter_id', Number(kriterId))
      }
      patch.durum = 'amir1_gonderildi'
      patch.puan_amir2 = toplam
      patch.amir1_tamam_at = new Date().toISOString()
      patch.iade_notu = null
    }
  }

  const { error } = await (supabase as Sb)
    .from('performans_degerlendirme')
    .update(patch)
    .eq('id', params.degerlendirmeId)
  if (error) return { hata: error.message }

  revalidatePath('/performans/degerlendirme')
  return {}
}

export async function performansAmir2Kaydet(params: {
  degerlendirmeId: number
  puanlar: Record<number, number>
  islem: 'onayla' | 'iade'
  iadeNotu?: string
}): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const sicil = await currentSicil(supabase)
  if (!sicil) return { hata: 'Sicil bulunamadı.' }

  const { data: deg } = await (supabase as Sb)
    .from('performans_degerlendirme')
    .select('*, donem:performans_donem(id, durum)')
    .eq('id', params.degerlendirmeId)
    .maybeSingle()
  if (!deg) return { hata: 'Kayıt bulunamadı.' }
  if (deg.donem?.durum !== 'Açık') return { hata: 'Dönem açık değil.' }

  const access = await getAppAccess(supabase, (await supabase.auth.getUser()).data.user!.id)
  const isAdmin = isAdminLike(access)
  if (!isAdmin && deg.amir2_sicil !== sicil) return { hata: '2. amir yetkiniz yok.' }
  if (deg.durum !== 'amir1_gonderildi') return { hata: 'Kayıt 2. amir incelemesinde değil.' }

  if (params.islem === 'iade') {
    const { error } = await (supabase as Sb)
      .from('performans_degerlendirme')
      .update({
        durum: 'iade',
        iade_notu: params.iadeNotu?.trim() || 'İade edildi',
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.degerlendirmeId)
    if (error) return { hata: error.message }
    revalidatePath('/performans/degerlendirme')
    return {}
  }

  for (const [kriterId, puan] of Object.entries(params.puanlar)) {
    const p = Number(puan)
    if (!Number.isFinite(p) || p < 1 || p > 5) continue
    const { error } = await (supabase as Sb)
      .from('performans_puan')
      .update({ puan_amir2: p })
      .eq('degerlendirme_id', params.degerlendirmeId)
      .eq('kriter_id', Number(kriterId))
    if (error) return { hata: error.message }
  }

  const { data: puanRows } = await (supabase as Sb)
    .from('performans_puan')
    .select('puan_amir1, puan_amir2')
    .eq('degerlendirme_id', params.degerlendirmeId)
  const toplam2 = (puanRows ?? []).reduce(
    (s: number, r: { puan_amir2: number | null }) => s + (r.puan_amir2 ?? 0),
    0,
  )
  const ortalama = performansOrtalamaYuvarla(deg.puan_amir1 ?? 0, toplam2)

  const { error } = await (supabase as Sb)
    .from('performans_degerlendirme')
    .update({
      durum: 'amir2_onay',
      puan_amir2: toplam2,
      ortalama,
      amir2_onay_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.degerlendirmeId)
  if (error) return { hata: error.message }

  revalidatePath('/performans/degerlendirme')
  return {}
}

/** Admin: personelin dönem değerlendirmesini başlangıç durumuna sıfırlar */
export async function performansDegerlendirmeSifirla(
  degerlendirmeId: number,
): Promise<{ hata?: string }> {
  const gate = await requireAdmin()
  if (gate.hata) return { hata: gate.hata }
  const { supabase } = gate

  const { data: deg } = await (supabase as Sb)
    .from('performans_degerlendirme')
    .select('id, donem_id, donem:performans_donem(durum)')
    .eq('id', degerlendirmeId)
    .maybeSingle()
  if (!deg) return { hata: 'Kayıt bulunamadı.' }
  if (deg.donem?.durum === 'Yayınlandı') {
    return { hata: 'Yayınlanmış dönemde değerlendirme sıfırlanamaz.' }
  }

  const { error: puanErr } = await (supabase as Sb)
    .from('performans_puan')
    .update({ puan_amir1: null, puan_amir2: null })
    .eq('degerlendirme_id', degerlendirmeId)
  if (puanErr) return { hata: puanErr.message }

  const { error } = await (supabase as Sb)
    .from('performans_degerlendirme')
    .update({
      durum: 'beklemede_1',
      puan_amir1: null,
      puan_amir2: null,
      ortalama: null,
      iade_notu: null,
      amir1_tamam_at: null,
      amir2_onay_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', degerlendirmeId)
  if (error) return { hata: error.message }

  revalidatePath('/performans/degerlendirme')
  revalidatePath(`/performans/degerlendirme/${deg.donem_id}`)
  return {}
}

/** 1. amir kendi listesindeki herkes 2.’ye gittiyse SMS gönderir */
export async function performansAmir2SmsGonder(donemId: number): Promise<{ hata?: string; mesaj?: string }> {
  const supabase = await createClient()
  const sicil = await currentSicil(supabase)
  if (!sicil) return { hata: 'Sicil bulunamadı.' }

  const { data: liste } = await (supabase as Sb)
    .from('performans_degerlendirme')
    .select('id, durum, amir2_sicil, tek_amir')
    .eq('donem_id', donemId)
    .eq('amir1_sicil', sicil)

  const rows = (liste ?? []).filter((r: { tek_amir: boolean }) => !r.tek_amir)
  if (rows.length === 0) return { hata: 'Gönderilecek kayıt yok.' }

  const unfinished = rows.filter((r: { durum: string }) =>
    r.durum === 'beklemede_1' || r.durum === 'iade',
  )
  if (unfinished.length > 0) {
    return {
      hata: `Değerlendirme henüz bitmedi. ${unfinished.length} personel hâlâ 1. amir aşamasında.`,
    }
  }

  const amir2Set = [...new Set(rows.map((r: { amir2_sicil: string | null }) => r.amir2_sicil).filter(Boolean))] as string[]
  if (amir2Set.length === 0) return { hata: '2. amir bulunamadı.' }

  const smsAyar = await fetchSmsAyar(supabase)
  if (!smsAyarHazirMi(smsAyar)) return { hata: 'SMS ayarları hazır değil (İletişim Yönetimi).' }
  const config = smsAyarToConfig(smsAyar)

  const { data: donem } = await (supabase as Sb).from('performans_donem').select('yil').eq('id', donemId).maybeSingle()
  const { data: ayar } = await (supabase as Sb).from('performans_sms_ayar').select('metin').eq('id', 1).maybeSingle()
  const sablon = ayar?.metin ?? 'Sayın {ad_soyad}, {yil} yılı performans değerlendirmeleri incelemenizi bekliyor.'

  let ok = 0
  const hatalar: string[] = []
  for (const amir2 of amir2Set) {
    const { data: cal } = await supabase.from('calisan').select('ad_soyad, telefon').eq('sicil_no', amir2).maybeSingle()
    if (!cal?.telefon) {
      hatalar.push(`${amir2}: telefon yok`)
      continue
    }
    const metin = sablonDoldur(sablon, {
      ad_soyad: cal.ad_soyad ?? '',
      ad: String(cal.ad_soyad ?? '').split(/\s+/)[0] ?? '',
      yil: String(donem?.yil ?? ''),
    })
    const sonuc = await smsGonderTekMetin(config, metin, [String(cal.telefon)])
    if (sonuc.ok) ok++
    else hatalar.push(`${amir2}: ${sonuc.hata ?? 'gönderilemedi'}`)
  }

  if (ok === 0) return { hata: hatalar.join('; ') || 'SMS gönderilemedi.' }
  return { mesaj: `${ok} alıcıya SMS gönderildi.${hatalar.length ? ` Uyarı: ${hatalar.join('; ')}` : ''}` }
}
