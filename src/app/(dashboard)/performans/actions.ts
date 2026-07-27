'use server'

import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { performansActionAdminBypass, performansActionSicil } from '@/lib/performans-oturum'
import { revalidatePath } from 'next/cache'
import {
  performansKriterKodlari,
  performansOrtalamaYuvarla,
  type PerformansFormTipi,
} from '@/lib/performans'
import { performansDonemKayitlariSenkronize } from '@/lib/performans-degerlendirme-sync'
import {
  performansOrgBaglamiYukle,
  performansDegerlendirmeAmirCanli,
  performansDegerlendirmeErisimVar,
  type PerformansKadroAmirSatir,
} from '@/lib/performans-degerlendirme-amir-canli'
import {
  mudurlukByNormHaritasi,
  performansKadroMudurlukEslesir,
  performansMudurlukKayitEslesir,
  performansKadroSatirlariIndeksi,
  performansKadroSatirSec,
  performansEtkinUnvanHaritasi,
  performansKadroUygun,
  performansPersonelEtkinUnvan,
  performansMudurlukCoz,
  performansMudurlukEslesir,
  performansMudurlukPersonelSatirindaMi,
  kadroMudurlukIndeksi,
  performansSicilEsit,
  tumAktifKadroHareketleriYukle,
} from '@/lib/performans-kadro'
import { writePerformansDegAuditLogSafe } from '@/lib/performans-degerlendirme-audit'
import { writePerformansImzaAuditLogSafe } from '@/lib/performans-imza-audit'
import { performansAmirImzaHaritasi, PERFORMANS_IMZA_BUCKET } from '@/lib/performans-amir-imza'
import type { OrgBirimSatir } from '@/lib/performans-amir'
import { sablonDoldur } from '@/lib/sms-sablon'
import { fetchSmsAyar, smsAyarHazirMi, smsAyarToConfig } from '@/lib/sms-ayar'
import { smsGonderTekMetin, gsmNormalize } from '@/lib/sms-mesajpaketi'
import { smsLogTekKayit } from '@/lib/sms-log-kayit'
import {
  PERFORMANS_AMIR2_SMS_TEST_TELEFON,
  performansAmir2BildirimMetni,
  performansAmir2BildirimSenaryoBelirle,
  performansAmir2SmsOriginator,
  performansDegerlendirilenAdlariMetni,
} from '@/lib/performans-amir2-bildirim'
import { performansTamamlanmaIkSmsDene } from '@/lib/performans-ik-sms-bildirim'
import { performansMudurUnvaniMi } from '@/lib/performans-unvan'
import { performansBbyAmir2PersonelSatirlari } from '@/lib/performans-amir-erisim'

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
  return performansActionSicil(supabase)
}

/** Açık döneme memur kadrolarını üret / eksikleri tamamla (admin) */
export async function performansDonemPersonelSeedle(donemId: number): Promise<{ hata?: string; eklenen?: number }> {
  const gate = await requireAdmin()
  if (gate.hata) return { hata: gate.hata }
  const { supabase } = gate

  const sonuc = await performansDonemKayitlariSenkronize(supabase, donemId)
  if (sonuc.hata) return { hata: sonuc.hata }

  if (sonuc.eklenen > 0 || sonuc.amirGuncellenen > 0 || sonuc.mudurlukGuncellenen > 0) {
    revalidatePath('/performans/donem')
    revalidatePath('/performans/degerlendirme')
    revalidatePath(`/performans/degerlendirme/${donemId}`)
  }

  return { eklenen: sonuc.eklenen }
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
  if (['amir2_onay', 'tamamlandi'].includes(deg.durum)) {
    return { hata: 'Değerlendirme tamamlanmış; sıfırlama olmadan düzenlenemez.' }
  }

  const isAdmin = await performansActionAdminBypass(supabase)
  const baglam = isAdmin ? null : await performansOrgBaglamiYukle(supabase)
  const canli = baglam
    ? performansDegerlendirmeAmirCanli(
        { sicil_no: deg.sicil_no, mudurluk_adi: deg.mudurluk_adi },
        baglam,
      )
    : null
  if (!isAdmin && canli?.amir1_sicil !== sicil) return { hata: '1. amir yetkiniz yok.' }
  if (!['beklemede_1', 'iade'].includes(deg.durum)) {
    return { hata: 'Bu kayıt 1. amir tarafından düzenlenemez.' }
  }

  const tekAmir = isAdmin ? deg.tek_amir : (canli?.tek_amir ?? deg.tek_amir)

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
    if (tekAmir) {
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

  const yeniDurum = (patch.durum as string | undefined) ?? deg.durum
  await writePerformansDegAuditLogSafe(supabase, {
    degerlendirmeId: params.degerlendirmeId,
    personelSicil: deg.sicil_no,
    islem: params.gonder ? 'gonder' : 'kaydet',
    ozet: params.gonder
      ? tekAmir
        ? '1. amir değerlendirmeyi tamamladı (tek amir)'
        : '1. amir değerlendirmeyi 2. amire gönderdi'
      : '1. amir taslak kaydetti',
    onceki: { durum: deg.durum, puan_amir1: deg.puan_amir1 },
    sonraki: { durum: yeniDurum, puan_amir1: toplam },
  })

  revalidatePath('/performans/degerlendirme')
  if (deg.donem_id) {
    revalidatePath(`/performans/degerlendirme/${deg.donem_id}`)
  }

  if (params.gonder && tekAmir && deg.donem_id) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      await performansTamamlanmaIkSmsDene(supabase, {
        donemId: deg.donem_id,
        sicilNo: deg.sicil_no,
        mudurlukAdi: deg.mudurluk_adi ?? null,
        tekAmir: true,
        actorId: user.id,
        actorEmail: user.email ?? null,
      })
    }
  }

  return {}
}

export async function performansAmir2Kaydet(params: {
  degerlendirmeId: number
  puanlar: Record<number, number>
  islem: 'kaydet' | 'onayla' | 'iade'
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
  if (['amir2_onay', 'tamamlandi'].includes(deg.durum)) {
    return { hata: 'Değerlendirme tamamlanmış; sıfırlama olmadan düzenlenemez.' }
  }

  const access = await getAppAccess(supabase, (await supabase.auth.getUser()).data.user!.id)
  const isAdmin = await performansActionAdminBypass(supabase)
  if (!isAdmin) {
    const baglam = await performansOrgBaglamiYukle(supabase)
    const canli = performansDegerlendirmeAmirCanli(
      { sicil_no: deg.sicil_no, mudurluk_adi: deg.mudurluk_adi },
      baglam,
    )
    if (canli.tek_amir || canli.amir2_sicil !== sicil) return { hata: '2. amir yetkiniz yok.' }
  }
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
    await writePerformansDegAuditLogSafe(supabase, {
      degerlendirmeId: params.degerlendirmeId,
      personelSicil: deg.sicil_no,
      islem: 'iade',
      ozet: '2. amir değerlendirmeyi 1. amire iade etti',
      onceki: { durum: deg.durum },
      sonraki: { durum: 'iade', iade_notu: params.iadeNotu?.trim() || 'İade edildi' },
    })
    revalidatePath('/performans/degerlendirme')
    if (deg.donem_id) revalidatePath(`/performans/degerlendirme/${deg.donem_id}`)
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
    .select('puan_amir2')
    .eq('degerlendirme_id', params.degerlendirmeId)
  const toplam2 = (puanRows ?? []).reduce(
    (s: number, r: { puan_amir2: number | null }) => s + (r.puan_amir2 ?? 0),
    0,
  )

  if (params.islem === 'kaydet') {
    const { error } = await (supabase as Sb)
      .from('performans_degerlendirme')
      .update({
        puan_amir2: toplam2,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.degerlendirmeId)
    if (error) return { hata: error.message }
    await writePerformansDegAuditLogSafe(supabase, {
      degerlendirmeId: params.degerlendirmeId,
      personelSicil: deg.sicil_no,
      islem: 'kaydet',
      ozet: '2. amir taslak kaydetti',
      onceki: { puan_amir2: deg.puan_amir2 },
      sonraki: { puan_amir2: toplam2 },
    })
    revalidatePath('/performans/degerlendirme')
    if (deg.donem_id) revalidatePath(`/performans/degerlendirme/${deg.donem_id}`)
    return {}
  }

  const { data: puanOrtRows } = await (supabase as Sb)
    .from('performans_puan')
    .select('puan_amir1, puan_amir2')
    .eq('degerlendirme_id', params.degerlendirmeId)
  const toplam2Onay = (puanOrtRows ?? []).reduce(
    (s: number, r: { puan_amir2: number | null }) => s + (r.puan_amir2 ?? 0),
    0,
  )
  const ortalama = performansOrtalamaYuvarla(deg.puan_amir1 ?? 0, toplam2Onay)

  const { error } = await (supabase as Sb)
    .from('performans_degerlendirme')
    .update({
      durum: 'amir2_onay',
      puan_amir2: toplam2Onay,
      ortalama,
      amir2_onay_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.degerlendirmeId)
  if (error) return { hata: error.message }

  await writePerformansDegAuditLogSafe(supabase, {
    degerlendirmeId: params.degerlendirmeId,
    personelSicil: deg.sicil_no,
    islem: 'onayla',
    ozet: '2. amir değerlendirmeyi onayladı',
    onceki: { durum: deg.durum, puan_amir2: deg.puan_amir2 },
    sonraki: { durum: 'amir2_onay', puan_amir2: toplam2Onay, ortalama },
  })

  revalidatePath('/performans/degerlendirme')
  if (deg.donem_id) revalidatePath(`/performans/degerlendirme/${deg.donem_id}`)

  if (deg.donem_id) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      await performansTamamlanmaIkSmsDene(supabase, {
        donemId: deg.donem_id,
        sicilNo: deg.sicil_no,
        mudurlukAdi: deg.mudurluk_adi ?? null,
        tekAmir: deg.tek_amir ?? false,
        actorId: user.id,
        actorEmail: user.email ?? null,
      })
    }
  }

  return {}
}

/** Değerlendirme süreci audit logları */
export async function performansDegerlendirmeAuditLoglari(
  degerlendirmeId: number,
): Promise<{ hata?: string; loglar?: import('@/types/database').Tables<'personel_audit_log'>[] }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum gerekli.' }
  const isAdmin = await performansActionAdminBypass(supabase)

  const { data: deg } = await (supabase as Sb)
    .from('performans_degerlendirme')
    .select('sicil_no, mudurluk_adi')
    .eq('id', degerlendirmeId)
    .maybeSingle()
  if (!deg) return { hata: 'Kayıt bulunamadı.' }

  if (!isAdmin) {
    const sicil = await currentSicil(supabase)
    if (!sicil) return { hata: 'Bu işlem için yetkiniz yok.' }
    const baglam = await performansOrgBaglamiYukle(supabase)
    if (
      !performansDegerlendirmeErisimVar(sicil, { sicil_no: deg.sicil_no, mudurluk_adi: deg.mudurluk_adi }, baglam)
    ) {
      return { hata: 'Bu işlem için yetkiniz yok.' }
    }
  }

  const { data: loglar } = await supabase
    .from('personel_audit_log')
    .select('*')
    .eq('ref_table', 'performans_degerlendirme')
    .eq('ref_id', String(degerlendirmeId))
    .order('created_at', { ascending: false })

  return { loglar: loglar ?? [] }
}

/** Organizasyon ağacına göre mevcut dönem kayıtlarının amir alanlarını günceller (server action). */
export async function performansDegerlendirmeAmirleriSenkronize(
  donemId: number,
): Promise<{ hata?: string; guncellenen?: number }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum gerekli.' }

  const { data: rows } = await (supabase as Sb)
    .from('performans_degerlendirme')
    .select('id, sicil_no, form_tipi, amir1_sicil, amir2_sicil, tek_amir')
    .eq('donem_id', donemId)

  if (!rows?.length) return { guncellenen: 0 }

  const { birimler, kadrolar, mudurlukByNorm } = await performansOrgBaglamiYukle(supabase)
  const kadroMap = performansKadroSatirlariIndeksi(kadrolar.filter(k => performansKadroUygun(k)))

  let guncellenen = 0
  for (const row of rows) {
    const kadro = kadroMap.get(row.sicil_no)
    const esleme = performansDegerlendirmeAmirCanli(
      { sicil_no: row.sicil_no, mudurluk_adi: kadro ? performansMudurlukCoz(kadro, mudurlukByNorm) : null },
      { birimler, kadrolar, mudurlukByNorm },
    )

    const patch = {
      form_tipi: esleme.formTipi,
      amir1_sicil: esleme.amir1_sicil,
      amir2_sicil: esleme.tek_amir ? null : esleme.amir2_sicil,
      tek_amir: esleme.tek_amir,
      updated_at: new Date().toISOString(),
    }

    const degisti =
      row.form_tipi !== patch.form_tipi ||
      row.amir1_sicil !== patch.amir1_sicil ||
      row.amir2_sicil !== patch.amir2_sicil ||
      row.tek_amir !== patch.tek_amir

    if (!degisti) continue

    const { error } = await (supabase as Sb)
      .from('performans_degerlendirme')
      .update(patch)
      .eq('id', row.id)
    if (error) return { hata: error.message }
    guncellenen++
  }

  if (guncellenen > 0) {
    revalidatePath('/performans/degerlendirme')
    revalidatePath(`/performans/degerlendirme/${donemId}`)
  }
  return { guncellenen }
}

/** Liste sırasında değerlendirme bekleyen bir sonraki personeli bulur. */
export async function performansSonrakiDegerlendirmeBul(params: {
  mevcutDegId: number
  donemId: number
  mudurlukAdi?: string | null
  rol: 'amir1' | 'amir2'
  /** BBY 1. amir müdür sırası: müdürlük filtresi yok, son müdürde toplu SMS */
  bbyAmir1Mudur?: boolean
  /** BBY 2. amir personel sırası */
  bbyAmir2Mod?: boolean
}): Promise<{
  hata?: string
  sonrakiId?: number | null
  mudurlukAmir1Tamam?: boolean
  amir2Ad?: string | null
  amir2Sicil?: string | null
  yil?: number | null
  bildirimMetni?: string | null
}> {
  const supabase = await createClient()
  const sicil = await currentSicil(supabase)
  if (!sicil) return { hata: 'Sicil bulunamadı.' }
  const isAdmin = await performansActionAdminBypass(supabase)

  await performansDonemKayitlariSenkronize(supabase, params.donemId)

  const { data: mevcut } = await (supabase as Sb)
    .from('performans_degerlendirme')
    .select('id, sicil_no, mudurluk_adi')
    .eq('id', params.mevcutDegId)
    .maybeSingle()
  if (!mevcut) return { hata: 'Kayıt bulunamadı.' }

  const { data: mudRaw } = await supabase.from('tanim_mudurluk').select('mudurluk_adi').eq('aktif', true)
  const mudurlukByNorm = mudurlukByNormHaritasi(
    (mudRaw ?? []).map((m: { mudurluk_adi: string | null }) => m.mudurluk_adi).filter(Boolean) as string[],
  )

  const kadroRows = await tumAktifKadroHareketleriYukle<{
    durumu?: string | null
    statu?: string | null
    gorev_mudurlugu?: string | null
    kadro_mudurlugu?: string | null
    kadro_unvani?: string | null
    gorev_unvani?: string | null
    asil?: string | null
    vekil?: string | null
  }>(
    supabase,
    'durumu, statu, gorev_mudurlugu, kadro_mudurlugu, kadro_unvani, gorev_unvani, asil, vekil',
  )
  const kadroIndeks = kadroMudurlukIndeksi(
    kadroRows.filter(k => performansKadroUygun(k)),
    mudurlukByNorm,
  )
  const etkinUnvanMap = performansEtkinUnvanHaritasi(kadroRows, mudurlukByNorm)

  const { data: rows } = await (supabase as Sb)
    .from('performans_degerlendirme')
    .select('id, sicil_no, mudurluk_adi, durum, tek_amir, amir1_sicil, amir2_sicil')
    .eq('donem_id', params.donemId)
    .order('sicil_no')

  const mudurluk =
    params.mudurlukAdi?.trim() ||
    (() => {
      const kadro = kadroIndeks.get(mevcut.sicil_no)
      return kadro?.kadro_mudurlugu?.trim() || mevcut.mudurluk_adi?.trim() || null
    })()
  const bbyAmir1Mudur = params.bbyAmir1Mudur === true
  const bbyAmir2Mod = params.bbyAmir2Mod === true

  let birimler: OrgBirimSatir[] = []
  const { data: aktifOrg } = await supabase
    .from('tanim_organizasyon')
    .select('id')
    .eq('aktif', true)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (aktifOrg?.id) {
    const { data: birimRaw } = await (supabase as Sb)
      .from('tanim_organizasyon_birim')
      .select(
        'id, birim_turu, mudurluk_id, personel_sicil_no, ust_birim_id, mudurluk:tanim_mudurluk(id, mudurluk_adi)',
      )
      .eq('organizasyon_id', aktifOrg.id)
    birimler = (birimRaw ?? []) as OrgBirimSatir[]
  }

  let liste = (rows ?? []) as {
    id: number
    sicil_no: string
    mudurluk_adi: string | null
    durum: string
    tek_amir: boolean
    amir1_sicil: string | null
    amir2_sicil: string | null
  }[]

  if (!isAdmin) {
    liste = liste.filter(r => {
      if (!kadroIndeks.has(r.sicil_no)) return false
      if (
        !performansMudurlukPersonelSatirindaMi({
          unvan: etkinUnvanMap.get(r.sicil_no),
          sicilNo: r.sicil_no,
          currentSicil: sicil,
          birimler,
        })
      ) {
        return false
      }
      if (bbyAmir1Mudur) return true
      if (mudurluk) {
        const kadro = kadroIndeks.get(r.sicil_no)
        if (!performansMudurlukKayitEslesir(mudurluk, {
          kadro_mudurlugu: kadro?.kadro_mudurlugu,
          mudurluk_adi: r.mudurluk_adi,
        })) {
          return false
        }
      }
      return true
    })
  } else if (bbyAmir1Mudur) {
    liste = liste.filter(r => performansMudurUnvaniMi(etkinUnvanMap.get(r.sicil_no) ?? ''))
  } else if (mudurluk) {
    liste = liste.filter(r => {
      const kadro = kadroIndeks.get(r.sicil_no)
      return performansMudurlukEslesir(mudurluk, {
        mudurluk_adi: r.mudurluk_adi ?? kadro?.mudurluk_adi,
        gorev_mudurlugu: kadro?.gorev_mudurlugu,
        kadro_mudurlugu: kadro?.kadro_mudurlugu,
      })
    })
  }

  if (bbyAmir2Mod && params.rol === 'amir2') {
    const amir2Satirlar = performansBbyAmir2PersonelSatirlari(
      sicil,
      liste.map(r => ({
        id: r.id,
        sicil_no: r.sicil_no,
        amir1_sicil: r.amir1_sicil,
        amir2_sicil: r.amir2_sicil,
        tek_amir: r.tek_amir,
      })),
      etkinUnvanMap,
    )
    const amir2IdSet = new Set(amir2Satirlar.map(r => r.id))
    liste = liste.filter(r => amir2IdSet.has(r.id))
  }

  const baglam = await performansOrgBaglamiYukle(supabase)

  if (bbyAmir1Mudur) {
    liste = liste.filter(r => {
      if (!performansMudurUnvaniMi(etkinUnvanMap.get(r.sicil_no) ?? '')) return false
      const kadro = kadroIndeks.get(r.sicil_no)
      const canli = performansDegerlendirmeAmirCanli(
        { sicil_no: r.sicil_no, mudurluk_adi: r.mudurluk_adi ?? kadro?.mudurluk_adi },
        baglam,
      )
      return isAdmin || performansSicilEsit(canli.amir1_sicil, sicil)
    })
  }

  function degerlendirilebilir(r: (typeof liste)[0]): boolean {
    const kadro = kadroIndeks.get(r.sicil_no)
    const canli = performansDegerlendirmeAmirCanli(
      {
        sicil_no: r.sicil_no,
        mudurluk_adi: r.mudurluk_adi ?? kadro?.mudurluk_adi,
      },
      baglam,
    )
    if (params.rol === 'amir1') {
      if (!['beklemede_1', 'iade'].includes(r.durum)) return false
      return isAdmin || performansSicilEsit(canli.amir1_sicil, sicil)
    }
    if (canli.tek_amir) return false
    if (r.durum !== 'amir1_gonderildi') return false
    return isAdmin || performansSicilEsit(canli.amir2_sicil, sicil)
  }

  const sonraki = liste.find(r => r.id !== params.mevcutDegId && degerlendirilebilir(r))

  let mudurlukAmir1Tamam = false
  let amir2Sicil: string | null = null
  let amir2Ad: string | null = null
  let yil: number | null = null
  let bildirimMetni: string | null = null

  if (params.rol === 'amir1' && (mudurluk || bbyAmir1Mudur)) {
    const { data: donem } = await (supabase as Sb)
      .from('performans_donem')
      .select('yil')
      .eq('id', params.donemId)
      .maybeSingle()
    yil = donem?.yil ?? null

    const mevcutCanli = performansDegerlendirmeAmirCanli(
      { sicil_no: mevcut.sicil_no, mudurluk_adi: mevcut.mudurluk_adi },
      baglam,
    )
    const hedefAmir1 = mevcutCanli.amir1_sicil

    const amir1Liste = bbyAmir1Mudur
      ? liste.filter(r => {
          if (r.tek_amir) return false
          const kadro = kadroIndeks.get(r.sicil_no)
          const canli = performansDegerlendirmeAmirCanli(
            { sicil_no: r.sicil_no, mudurluk_adi: r.mudurluk_adi ?? kadro?.mudurluk_adi },
            baglam,
          )
          return performansSicilEsit(canli.amir1_sicil, hedefAmir1)
        })
      : liste.filter(r => {
          if (r.tek_amir) return false
          const kadro = kadroIndeks.get(r.sicil_no)
          const canli = performansDegerlendirmeAmirCanli(
            { sicil_no: r.sicil_no, mudurluk_adi: r.mudurluk_adi ?? kadro?.mudurluk_adi },
            baglam,
          )
          return performansSicilEsit(canli.amir1_sicil, hedefAmir1)
        })

    if (amir1Liste.length > 0) {
      const bekleyen = amir1Liste.filter(r => r.durum === 'beklemede_1' || r.durum === 'iade')
      mudurlukAmir1Tamam = bekleyen.length === 0
      if (mudurlukAmir1Tamam) {
        const ornek = amir1Liste[0]
        const kadro = kadroIndeks.get(ornek.sicil_no)
        const canli = performansDegerlendirmeAmirCanli(
          { sicil_no: ornek.sicil_no, mudurluk_adi: ornek.mudurluk_adi ?? kadro?.mudurluk_adi },
          baglam,
        )
        amir2Sicil = canli.amir2_sicil ?? ornek.amir2_sicil
        if (amir2Sicil) {
          const { data: amir2Cal } = await supabase
            .from('calisan')
            .select('ad_soyad')
            .eq('sicil_no', amir2Sicil)
            .maybeSingle()
          amir2Ad = amir2Cal?.ad_soyad?.trim() || amir2Sicil
          if (yil && hedefAmir1) {
            const senaryo = performansAmir2BildirimSenaryoBelirle(hedefAmir1, birimler)
            let amir1Ad: string | null = null
            let degerlendirilenAd: string | null = null
            if (senaryo === 'baskan_yardimcisi') {
              const { data: amir1Cal } = await supabase
                .from('calisan')
                .select('ad_soyad')
                .eq('sicil_no', hedefAmir1)
                .maybeSingle()
              amir1Ad = amir1Cal?.ad_soyad?.trim() || hedefAmir1

              const degerlendirilenSiciller = [
                ...new Set(amir1Liste.map(r => r.sicil_no.trim()).filter(Boolean)),
              ]
              if (degerlendirilenSiciller.length > 0) {
                const { data: degerlendirilenCal } = await supabase
                  .from('calisan')
                  .select('sicil_no, ad_soyad')
                  .in('sicil_no', degerlendirilenSiciller)
                const adHaritasi = new Map(
                  (degerlendirilenCal ?? []).map(c => [c.sicil_no, c.ad_soyad?.trim() || c.sicil_no]),
                )
                degerlendirilenAd = performansDegerlendirilenAdlariMetni(
                  degerlendirilenSiciller.map(s => adHaritasi.get(s) ?? s),
                )
              }
            }
            bildirimMetni = performansAmir2BildirimMetni({
              amir2Ad,
              yil,
              senaryo,
              mudurlukAdi: mudurluk ?? ornek.mudurluk_adi ?? kadro?.mudurluk_adi ?? 'Müdürlük',
              amir1Ad,
              degerlendirilenAd,
            })
          }
        }
      }
    }
  }

  return {
    sonrakiId: sonraki?.id ?? null,
    mudurlukAmir1Tamam,
    amir2Ad,
    amir2Sicil,
    yil,
    bildirimMetni,
  }
}

/** Müdürlükte 1. amir değerlendirmesi bittiğinde 2. amire bildirim SMS (test numarasına). */
export async function performansAmir2MudurlukBildirimSmsGonder(params: {
  donemId: number
  mudurlukAdi?: string
  mevcutDegId: number
  bbyAmir1Mudur?: boolean
}): Promise<{ hata?: string; mesaj?: string }> {
  const supabase = await createClient()
  const sicil = await currentSicil(supabase)
  if (!sicil) return { hata: 'Sicil bulunamadı.' }
  const isAdmin = await performansActionAdminBypass(supabase)

  const mudurluk = params.mudurlukAdi?.trim() || ''
  if (!params.bbyAmir1Mudur && !mudurluk) return { hata: 'Müdürlük bilgisi gerekli.' }

  const kontrol = await performansSonrakiDegerlendirmeBul({
    mevcutDegId: params.mevcutDegId,
    donemId: params.donemId,
    mudurlukAdi: mudurluk || null,
    rol: 'amir1',
    bbyAmir1Mudur: params.bbyAmir1Mudur,
  })
  if (kontrol.hata) return { hata: kontrol.hata }
  if (!kontrol.mudurlukAmir1Tamam) {
    return { hata: 'Bu müdürlükte 1. amir değerlendirmesi henüz tamamlanmadı.' }
  }
  if (!kontrol.bildirimMetni) {
    return { hata: '2. amir bilgisi bulunamadı.' }
  }

  if (!isAdmin) {
    const baglam = await performansOrgBaglamiYukle(supabase)
    const { data: mevcutDeg } = await (supabase as Sb)
      .from('performans_degerlendirme')
      .select('sicil_no, mudurluk_adi')
      .eq('id', params.mevcutDegId)
      .maybeSingle()
    if (!mevcutDeg) return { hata: 'Kayıt bulunamadı.' }
    const canli = performansDegerlendirmeAmirCanli(mevcutDeg, baglam)
    if (!performansSicilEsit(canli.amir1_sicil, sicil)) {
      return { hata: 'Bu işlem için 1. amir yetkiniz yok.' }
    }
  }

  const smsAyar = await fetchSmsAyar(supabase)
  if (!smsAyarHazirMi(smsAyar)) {
    return { hata: 'SMS ayarları hazır değil (İletişim Yönetimi → Tanımlar).' }
  }

  const originatorSec = performansAmir2SmsOriginator(smsAyar)
  if (originatorSec.hata || !originatorSec.originator) {
    return { hata: originatorSec.hata ?? 'SMS başlığı seçilemedi.' }
  }

  const telefon = gsmNormalize(PERFORMANS_AMIR2_SMS_TEST_TELEFON)
  if (!telefon) {
    return { hata: 'Test telefon numarası geçersiz.' }
  }

  const config = smsAyarToConfig(smsAyar)
  config.originator = originatorSec.originator

  const sonuc = await smsGonderTekMetin(config, kontrol.bildirimMetni, [telefon])

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    await smsLogTekKayit(supabase, {
      actorId: user.id,
      actorEmail: user.email ?? null,
      aliciAd: kontrol.amir2Ad ?? null,
      aliciSicil: kontrol.amir2Sicil ?? null,
      telefon,
      mesaj: kontrol.bildirimMetni,
      originator: config.originator,
      baglam: 'performans_amir2_bildirim',
      sonuc,
    })
  }

  revalidatePath('/iletisim-yonetimi/gecmis-gonderimler')

  if (!sonuc.ok) return { hata: sonuc.hata ?? 'SMS gönderilemedi.' }

  return {
    mesaj: `Bildirim SMS test hattına (${PERFORMANS_AMIR2_SMS_TEST_TELEFON}) gönderildi.`,
  }
}

export type PerformansEk5OnizleVeri = {
  ad_soyad: string
  sicil_no: string
  tckn: string | null
  kadro_unvani: string | null
  gorev_unvani: string | null
  gorev_yeri: string | null
  islem_tarihi: string | null
  donem_yil: number
  form_tipi: PerformansFormTipi
  tek_amir: boolean
  puan_amir1: number | null
  puan_amir2: number | null
  ortalama: number | null
  amir1_ad: string | null
  amir2_ad: string | null
  amir1_unvan: string | null
  amir2_unvan: string | null
  amir1_tarih: string | null
  amir2_tarih: string | null
  amir1_imza_url: string | null
  amir2_imza_url: string | null
  kriterler: {
    kod: number
    baslik: string
    aciklama: string | null
    puan_amir1: number | null
    puan_amir2: number | null
  }[]
}

/** Ek-5 performans değerlendirme formu önizleme verisi */
function performansTarihGgAaYyyy(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const gg = String(d.getDate()).padStart(2, '0')
  const aa = String(d.getMonth() + 1).padStart(2, '0')
  return `${gg}.${aa}.${d.getFullYear()}`
}

export async function performansEk5OnizleVeri(
  degerlendirmeId: number,
): Promise<{ hata?: string; veri?: PerformansEk5OnizleVeri }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum gerekli.' }
  const isAdmin = await performansActionAdminBypass(supabase)

  const { data: deg } = await (supabase as Sb)
    .from('performans_degerlendirme')
    .select('*, donem:performans_donem(yil)')
    .eq('id', degerlendirmeId)
    .maybeSingle()
  if (!deg) return { hata: 'Kayıt bulunamadı.' }

  if (!isAdmin) {
    const sicil = await currentSicil(supabase)
    if (!sicil) return { hata: 'Bu işlem için yetkiniz yok.' }
    const baglam = await performansOrgBaglamiYukle(supabase)
    if (
      !performansDegerlendirmeErisimVar(sicil, { sicil_no: deg.sicil_no, mudurluk_adi: deg.mudurluk_adi }, baglam)
    ) {
      return { hata: 'Bu işlem için yetkiniz yok.' }
    }
  }

  const { data: cal } = await supabase
    .from('calisan')
    .select('ad_soyad, tckn')
    .eq('sicil_no', deg.sicil_no)
    .maybeSingle()

  const { data: kadroRows } = await supabase
    .from('kadro_hareketleri')
    .select('kadro_unvani, gorev_unvani, gorev_mudurlugu, kadro_mudurlugu, asil, vekil, statu, durumu')
    .or(`asil.eq.${deg.sicil_no},vekil.eq.${deg.sicil_no}`)
    .is('ayrilis_tarihi', null)

  const { data: mudRaw } = await supabase.from('tanim_mudurluk').select('mudurluk_adi').eq('aktif', true)
  const mudurlukByNorm = mudurlukByNormHaritasi(
    (mudRaw ?? []).map(m => m.mudurluk_adi).filter(Boolean) as string[],
  )

  const kadro = performansKadroSatirSec(deg.sicil_no, (kadroRows ?? []) as PerformansKadroAmirSatir[])
  const etkinUnvan = performansPersonelEtkinUnvan(
    deg.sicil_no,
    deg.mudurluk_adi,
    (kadroRows ?? []) as PerformansKadroAmirSatir[],
    mudurlukByNorm,
  )

  const { data: puanRows } = await (supabase as Sb)
    .from('performans_puan')
    .select('puan_amir1, puan_amir2, kriter:performans_kriter(kod, baslik, aciklama)')
    .eq('degerlendirme_id', degerlendirmeId)

  const kriterler = (puanRows ?? [])
    .map((p: {
      puan_amir1: number | null
      puan_amir2: number | null
      kriter: { kod: number; baslik: string; aciklama: string | null } | null
    }) => ({
      kod: p.kriter?.kod ?? 0,
      baslik: p.kriter?.baslik ?? '—',
      aciklama: p.kriter?.aciklama ?? null,
      puan_amir1: p.puan_amir1,
      puan_amir2: p.puan_amir2,
    }))
    .sort((a: { kod: number }, b: { kod: number }) => a.kod - b.kod)

  const amirSiciller = [deg.amir1_sicil, deg.amir2_sicil].filter(Boolean) as string[]
  const amirAdMap: Record<string, string> = {}
  const amirUnvanMap: Record<string, string | null> = {}
  if (amirSiciller.length > 0) {
    const { data: amirCal } = await supabase
      .from('calisan')
      .select('sicil_no, ad_soyad')
      .in('sicil_no', amirSiciller)
    ;(amirCal ?? []).forEach(c => {
      if (c.sicil_no) amirAdMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no
    })

    const { data: amirKadro } = await supabase
      .from('kadro_hareketleri')
      .select('asil, vekil, kadro_unvani, gorev_unvani, gorev_mudurlugu, kadro_mudurlugu, statu, durumu')
      .is('ayrilis_tarihi', null)
      .or(amirSiciller.map(s => `asil.eq.${s},vekil.eq.${s}`).join(','))

    for (const s of amirSiciller) {
      amirUnvanMap[s] = performansPersonelEtkinUnvan(
        s,
        null,
        (amirKadro ?? []) as PerformansKadroAmirSatir[],
        mudurlukByNorm,
      )
    }
  }

  const islemTarihiKaynak =
    deg.amir2_onay_at ?? deg.amir1_tamam_at ?? deg.updated_at ?? null

  const imzaMap = await performansAmirImzaHaritasi(supabase, amirSiciller)

  return {
    veri: {
      ad_soyad: cal?.ad_soyad ?? deg.sicil_no,
      sicil_no: deg.sicil_no,
      tckn: cal?.tckn ?? null,
      kadro_unvani: etkinUnvan ?? kadro?.kadro_unvani ?? null,
      gorev_unvani: etkinUnvan ?? kadro?.gorev_unvani ?? null,
      gorev_yeri: deg.mudurluk_adi ?? kadro?.gorev_mudurlugu ?? kadro?.kadro_mudurlugu ?? null,
      islem_tarihi: performansTarihGgAaYyyy(islemTarihiKaynak),
      donem_yil: deg.donem?.yil ?? new Date().getFullYear(),
      form_tipi: deg.form_tipi as PerformansFormTipi,
      tek_amir: deg.tek_amir,
      puan_amir1: deg.puan_amir1,
      puan_amir2: deg.puan_amir2,
      ortalama: deg.ortalama,
      amir1_ad: deg.amir1_sicil ? (amirAdMap[deg.amir1_sicil] ?? deg.amir1_sicil) : null,
      amir2_ad: deg.amir2_sicil ? (amirAdMap[deg.amir2_sicil] ?? deg.amir2_sicil) : null,
      amir1_unvan: deg.amir1_sicil ? (amirUnvanMap[deg.amir1_sicil] ?? null) : null,
      amir2_unvan: deg.amir2_sicil ? (amirUnvanMap[deg.amir2_sicil] ?? null) : null,
      amir1_tarih: performansTarihGgAaYyyy(deg.amir1_tamam_at),
      amir2_tarih: performansTarihGgAaYyyy(deg.amir2_onay_at),
      amir1_imza_url: deg.amir1_sicil ? (imzaMap[deg.amir1_sicil]?.imza_url ?? null) : null,
      amir2_imza_url: deg.amir2_sicil ? (imzaMap[deg.amir2_sicil]?.imza_url ?? null) : null,
      kriterler,
    },
  }
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
    .select('id, donem_id, sicil_no, donem:performans_donem(durum)')
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

  await writePerformansDegAuditLogSafe(supabase, {
    degerlendirmeId,
    personelSicil: deg.sicil_no ?? '',
    islem: 'sifirla',
    ozet: 'Yönetici değerlendirmeyi sıfırladı',
    onceki: { durum: '—' },
    sonraki: { durum: 'beklemede_1' },
  })

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

const IMZA_MIME = ['image/png', 'image/jpeg', 'image/webp'] as const
const IMZA_MAX_BOYUT = 2 * 1024 * 1024

/** Admin: 1./2. amir imza görseli yükle veya değiştir */
export async function performansAmirImzaYukle(formData: FormData): Promise<{ hata?: string }> {
  const gate = await requireAdmin()
  if (gate.hata) return { hata: gate.hata }
  const { supabase, user } = gate

  const sicil = String(formData.get('sicil_no') ?? '').trim()
  const file = formData.get('file')
  if (!sicil) return { hata: 'Sicil gerekli.' }
  if (!(file instanceof File) || file.size === 0) return { hata: 'Dosya gerekli.' }
  if (file.size > IMZA_MAX_BOYUT) return { hata: 'Dosya en fazla 2 MB olabilir.' }
  if (!IMZA_MIME.includes(file.type as (typeof IMZA_MIME)[number])) {
    return { hata: 'Yalnızca PNG, JPEG veya WebP yüklenebilir.' }
  }

  const ext =
    file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const storagePath = `${sicil}/imza.${ext}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: onceki } = await (supabase as any)
    .from('performans_amir_imza')
    .select('storage_path, dosya_adi, mime_type')
    .eq('sicil_no', sicil)
    .maybeSingle()

  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: uploadErr } = await supabase.storage
    .from(PERFORMANS_IMZA_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true,
    })
  if (uploadErr) return { hata: uploadErr.message }

  const { error: dbErr } = await (supabase as Sb)
    .from('performans_amir_imza')
    .upsert({
      sicil_no: sicil,
      storage_path: storagePath,
      dosya_adi: file.name,
      mime_type: file.type,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
  if (dbErr) return { hata: dbErr.message }

  const yeniKayit = {
    storage_path: storagePath,
    dosya_adi: file.name,
    mime_type: file.type,
  }

  await writePerformansImzaAuditLogSafe(supabase, {
    amirSicil: sicil,
    islem: onceki ? 'degistir' : 'yukle',
    ozet: onceki ? 'Amir imzası değiştirildi' : 'Amir imzası yüklendi',
    onceki: onceki ?? null,
    sonraki: yeniKayit,
  })

  revalidatePath('/performans/tanimlar/imzalar')
  return {}
}
