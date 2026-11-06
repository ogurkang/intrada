'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getKullaniciGorevMudurlukleri } from '@/lib/kullanici-mudurluk'
import { ppMaliyetSeciciMi, ppNorm, ppOturum } from '@/lib/pp-erisim'
import {
  PP_BIRIMLER,
  ppPerformansYol,
  ppZenginMetinTemiz,
  type PpFaaliyetGirdi,
  type PpGostergeGirdi,
  type PpPhSecenek,
} from '@/lib/pp-iliski'

export async function ppIliskiSecenekleri(): Promise<{ secenekler: PpPhSecenek[]; hata?: string }> {
  const supabase = await createClient()
  if (!(await ppOturum(supabase))) return { secenekler: [], hata: 'Oturum gerekli.' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data: amacRaw } = await sb.from('stratejik_plan_amac').select('id, kodu, amac_adi').eq('aktif', true)
  const amaclar = (amacRaw ?? []) as { id: number; kodu: string; amac_adi: string }[]
  const amacIds = amaclar.map(a => a.id)
  const { data: hedefRaw } = amacIds.length
    ? await sb.from('stratejik_plan_hedef').select('id, amac_id, kodu, hedef_adi').in('amac_id', amacIds).eq('aktif', true)
    : { data: [] }
  const hedefler = (hedefRaw ?? []) as { id: number; amac_id: number; kodu: string; hedef_adi: string }[]
  const hedefIds = hedefler.map(h => h.id)
  const { data: altRaw } = hedefIds.length
    ? await sb.from('stratejik_plan_alt_hedef').select('id, hedef_id, kodu, alt_hedef_adi, mudurluk').in('hedef_id', hedefIds).eq('aktif', true).order('kodu')
    : { data: [] }
  const amacById = new Map(amaclar.map(a => [a.id, a]))
  const hedefById = new Map(hedefler.map(h => [h.id, h]))
  const secenekler: PpPhSecenek[] = ((altRaw ?? []) as { id: number; hedef_id: number; kodu: string; alt_hedef_adi: string; mudurluk: string }[]).map(alt => {
    const hedef = hedefById.get(alt.hedef_id)
    const amac = hedef ? amacById.get(hedef.amac_id) : undefined
    const kod = ppPerformansYol(amac?.kodu ?? '', hedef?.kodu ?? '', alt.kodu)
    return {
      id: alt.id,
      kod,
      ad: alt.alt_hedef_adi,
      mudurluk: alt.mudurluk,
      etiket: `${kod}  ${alt.alt_hedef_adi}`,
    }
  })
  secenekler.sort((a, b) => a.etiket.localeCompare(b.etiket, 'tr'))
  return { secenekler }
}

async function yazabilir(altHedefId: number): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const ot = await ppOturum(supabase)
  if (!ot) return { hata: 'Oturum gerekli.' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data: hedef } = await sb.from('stratejik_plan_alt_hedef').select('mudurluk').eq('id', altHedefId).maybeSingle()
  if (!hedef) return { hata: 'Performans hedefi bulunamadı.' }
  if (await ppMaliyetSeciciMi(supabase, ot.access)) return {}
  if (ot.access.mode !== 'kullanici') return { hata: 'Bu müdürlük için kayıt yetkiniz yok.' }
  const km = await getKullaniciGorevMudurlukleri(supabase, ot.access.sicilNo)
  if (!km.mudurlukler.some(m => ppNorm(m) === ppNorm(String(hedef.mudurluk ?? '')))) {
    return { hata: 'Bu müdürlük için kayıt yetkiniz yok.' }
  }
  return {}
}

function tabloYok(mesaj: string): boolean {
  return mesaj.includes('performans_programi_pf_') || mesaj.includes('schema cache') || mesaj.includes('gerekce')
}

export async function ppIliskiKaydet(girdi: {
  altProgramId?: number
  bagId?: number
  yalnizHedef?: boolean
  programId: number
  yil: number
  sira: number | null
  kodu: string
  ad: string
  altHedefId: number
  gerekce: string
  faaliyetler: PpFaaliyetGirdi[]
}): Promise<{ hata?: string; id?: number }> {
  const kodu = girdi.kodu.trim()
  const ad = girdi.ad.trim()
  if (!girdi.yalnizHedef && (!kodu || !ad)) return { hata: 'Alt program kodu ve adı zorunludur.' }
  if (!Number.isFinite(girdi.altHedefId)) return { hata: 'Performans hedefi seçin.' }
  const yetki = await yazabilir(girdi.altHedefId)
  if (yetki.hata) return yetki
  const birimler = new Set<string>(PP_BIRIMLER)
  for (const f of girdi.faaliyetler) {
    if (!f.ad.trim()) return { hata: 'Performans faaliyeti adı zorunludur.' }
    for (const g of f.gostergeler) {
      if (!g.ad.trim() || !birimler.has(g.birim)) return { hata: 'Gösterge adı ve ölçü birimi zorunludur.' }
    }
  }
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  let altId = Number(girdi.altProgramId)
  let bagId = Number(girdi.bagId)
  if (Number.isFinite(bagId) && bagId > 0) {
    const { error } = await sb.from('performans_programi_alt_program_hedef').update({
      alt_hedef_id: girdi.altHedefId,
      gerekce: girdi.gerekce.trim(),
    }).eq('id', bagId).eq('alt_program_id', altId)
    if (error) return { hata: error.message }
    await sb.from('performans_programi_pf_faaliyet').delete().eq('bag_id', bagId)
  } else if (girdi.yalnizHedef && Number.isFinite(altId) && altId > 0) {
    const { data: bag, error: bagHata } = await sb.from('performans_programi_alt_program_hedef').insert({
      alt_program_id: altId,
      alt_hedef_id: girdi.altHedefId,
      gerekce: girdi.gerekce.trim(),
    }).select('id').single()
    if (bagHata) {
      if (String(bagHata.code) === '23505' || String(bagHata.message).includes('duplicate')) {
        return { hata: 'Bu performans hedefi zaten bağlı.' }
      }
      return { hata: tabloYok(bagHata.message) ? 'Kayıt tablosu yok. 20261105120000_pp_iliski_yeni.sql dosyasını çalıştırın.' : bagHata.message }
    }
    bagId = Number(bag?.id)
  } else if (Number.isFinite(altId) && altId > 0) {
    const { error } = await sb.from('performans_programi_alt_program').update({
      sira_no: girdi.sira,
      kodu,
      alt_program_adi: ad,
    }).eq('id', altId).eq('program_id', girdi.programId)
    if (error) return { hata: error.message }
    await sb.from('performans_programi_alt_program_hedef').delete().eq('alt_program_id', altId)
    const { data: bag, error: bagHata } = await sb.from('performans_programi_alt_program_hedef').insert({
      alt_program_id: altId,
      alt_hedef_id: girdi.altHedefId,
      gerekce: girdi.gerekce.trim(),
    }).select('id').single()
    if (bagHata) return { hata: bagHata.message }
    bagId = Number(bag?.id)
  } else {
    const { data, error } = await sb.from('performans_programi_alt_program').insert({
      program_id: girdi.programId,
      sira_no: girdi.sira,
      kodu,
      alt_program_adi: ad,
      aktif: true,
    }).select('id').single()
    if (error) return { hata: error.message }
    altId = Number(data?.id)
    const { data: bag, error: bagHata } = await sb.from('performans_programi_alt_program_hedef').insert({
      alt_program_id: altId,
      alt_hedef_id: girdi.altHedefId,
      gerekce: girdi.gerekce.trim(),
    }).select('id').single()
    if (bagHata) {
      return { hata: tabloYok(bagHata.message) ? 'Kayıt tablosu yok. 20261105120000_pp_iliski_yeni.sql dosyasını çalıştırın.' : bagHata.message }
    }
    bagId = Number(bag?.id)
  }
  for (let i = 0; i < girdi.faaliyetler.length; i += 1) {
    const f = girdi.faaliyetler[i]
    const { data: faaliyet, error: fHata } = await sb.from('performans_programi_pf_faaliyet').insert({
      bag_id: bagId,
      sira_no: i + 1,
      faaliyet_adi: f.ad.trim(),
    }).select('id').single()
    if (fHata) return { hata: fHata.message }
    if (!f.gostergeler.length) continue
    const { error: gHata } = await sb.from('performans_programi_pf_gosterge').insert(f.gostergeler.map((g, gi) => ({
      faaliyet_id: faaliyet.id,
      sira_no: gi + 1,
      gosterge_adi: g.ad.trim(),
      birim: g.birim,
      aciklama: g.aciklama.trim(),
      hesaplama_yontemi: g.hesaplama.trim(),
      t2_gerceklesme: g.t2,
      t1_planlanan: g.t1plan,
      t1_yil_sonu: g.t1son,
      t_hedef: g.thedef,
      t1_tahmin: g.t1tahmin,
      t2_tahmin: g.t2tahmin,
    })))
    if (gHata) return { hata: gHata.message }
  }
  revalidatePath(`/stratejik-yonetim/performans-programi/islemler/${girdi.yil}/${girdi.programId}`)
  return { id: altId }
}

export async function ppFaaliyetEkle(altProgramId: number, yil: number, programId: number, ad: string): Promise<{ hata?: string }> {
  const faaliyetAdi = ad.trim()
  if (!faaliyetAdi) return { hata: 'Faaliyet adı girin.' }
  const supabase = await createClient()
  if (!(await ppOturum(supabase))) return { hata: 'Oturum gerekli.' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data: varOlan } = await sb.from('performans_programi_pf_faaliyet').select('sira_no').eq('alt_program_id', altProgramId)
  const nolar = ((varOlan ?? []) as { sira_no: number | null }[]).map(r => Number(r.sira_no)).filter(Number.isFinite)
  const sira = (nolar.length ? Math.max(...nolar) : 0) + 1
  const { error } = await sb.from('performans_programi_pf_faaliyet').insert({
    alt_program_id: altProgramId,
    sira_no: sira,
    faaliyet_adi: faaliyetAdi,
  })
  if (error) return { hata: error.message.includes('alt_program_id') ? 'Faaliyet tablosu güncel değil. 20261105160000_pp_faaliyet_once.sql dosyasını çalıştırın.' : error.message }
  revalidatePath(`/stratejik-yonetim/performans-programi/islemler/${yil}/${programId}/${altProgramId}/faaliyetler`)
  return {}
}

export async function ppAltProgramHedefiEkle(
  faaliyetId: number,
  altProgramId: number,
  yil: number,
  programId: number,
  altHedefId: number,
  mudurluk: string,
  gerekce = '',
): Promise<{ hata?: string }> {
  const mud = mudurluk.trim()
  if (!Number.isFinite(altHedefId)) return { hata: 'Performans hedefi seçin.' }
  if (!mud) return { hata: 'Müdürlük seçin.' }
  const yetki = await yazabilir(altHedefId)
  if (yetki.hata) return yetki
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { error } = await sb.from('performans_programi_alt_program_hedef').insert({
    alt_program_id: altProgramId,
    alt_hedef_id: altHedefId,
    faaliyet_id: faaliyetId,
    secilen_mudurluk: mud,
    gerekce: ppZenginMetinTemiz(gerekce),
  })
  if (error) {
    if (String(error.code) === '23505' || String(error.message).includes('duplicate')) return { hata: 'Bu performans hedefi zaten bağlı.' }
    return { hata: error.message }
  }
  revalidatePath(`/stratejik-yonetim/performans-programi/islemler/${yil}/${programId}/${altProgramId}/faaliyetler/${faaliyetId}`)
  return {}
}

export async function ppAltProgramHedefiGuncelle(
  id: number,
  faaliyetId: number,
  altProgramId: number,
  yil: number,
  programId: number,
  altHedefId: number,
  mudurluk: string,
  gerekce = '',
): Promise<{ hata?: string }> {
  const mud = mudurluk.trim()
  if (!Number.isFinite(id) || id <= 0) return { hata: 'Kayıt bulunamadı.' }
  if (!Number.isFinite(altHedefId)) return { hata: 'Performans hedefi seçin.' }
  if (!mud) return { hata: 'Müdürlük seçin.' }
  const yetki = await yazabilir(altHedefId)
  if (yetki.hata) return yetki
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('performans_programi_alt_program_hedef').update({
    alt_hedef_id: altHedefId,
    secilen_mudurluk: mud,
    gerekce: ppZenginMetinTemiz(gerekce),
  }).eq('id', id).eq('faaliyet_id', faaliyetId).eq('alt_program_id', altProgramId)
  if (error) {
    if (String(error.code) === '23505' || String(error.message).includes('duplicate')) return { hata: 'Bu performans hedefi zaten bağlı.' }
    return { hata: error.message }
  }
  revalidatePath(`/stratejik-yonetim/performans-programi/islemler/${yil}/${programId}/${altProgramId}/faaliyetler/${faaliyetId}`)
  return {}
}

const BAGLI_KAYIT = 'Silmek istediğiniz başlığa bağlı veriler bulunmaktadır.'

export async function ppFaaliyetSil(id: number, altProgramId: number, yil: number, programId: number): Promise<{ hata?: string }> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { count, error: sayHata } = await sb.from('performans_programi_alt_program_hedef').select('id', { count: 'exact', head: true }).eq('faaliyet_id', id)
  if (sayHata) return { hata: sayHata.message }
  if ((count ?? 0) > 0) return { hata: BAGLI_KAYIT }
  const { error } = await sb.from('performans_programi_pf_faaliyet').delete().eq('id', id).eq('alt_program_id', altProgramId)
  if (error) return { hata: error.message }
  revalidatePath(`/stratejik-yonetim/performans-programi/islemler/${yil}/${programId}/${altProgramId}/faaliyetler`)
  return {}
}

export async function ppAltProgramHedefiSil(id: number, faaliyetId: number, yil: number, programId: number, altProgramId: number): Promise<{ hata?: string }> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { count, error: sayHata } = await sb.from('performans_programi_pf_faaliyet').select('id', { count: 'exact', head: true }).eq('bag_id', id)
  if (sayHata) return { hata: sayHata.message }
  if ((count ?? 0) > 0) return { hata: BAGLI_KAYIT }
  const { error } = await sb.from('performans_programi_alt_program_hedef').delete().eq('id', id).eq('faaliyet_id', faaliyetId)
  if (error) return { hata: error.message }
  revalidatePath(`/stratejik-yonetim/performans-programi/islemler/${yil}/${programId}/${altProgramId}/faaliyetler/${faaliyetId}`)
  return {}
}

export async function ppPerformansFaaliyetKaydet(girdi: {
  bagId: number
  altProgramId: number
  yil: number
  programId: number
  faaliyetId: number
  gerekce: string
  faaliyetler: PpFaaliyetGirdi[]
}): Promise<{ hata?: string }> {
  const birimler = new Set<string>(PP_BIRIMLER)
  for (const f of girdi.faaliyetler) {
    if (!f.ad.trim()) return { hata: 'Performans faaliyeti adı zorunludur.' }
    for (const g of f.gostergeler) {
      if (!g.ad.trim() || !birimler.has(g.birim)) return { hata: 'Gösterge adı ve ölçü birimi zorunludur.' }
    }
  }
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { error: guncelleHata } = await sb.from('performans_programi_alt_program_hedef').update({
    gerekce: girdi.gerekce.trim(),
  }).eq('id', girdi.bagId).eq('faaliyet_id', girdi.faaliyetId)
  if (guncelleHata) return { hata: guncelleHata.message }
  await sb.from('performans_programi_pf_faaliyet').delete().eq('bag_id', girdi.bagId)
  for (let i = 0; i < girdi.faaliyetler.length; i += 1) {
    const f = girdi.faaliyetler[i]
    const { data: faaliyet, error: fHata } = await sb.from('performans_programi_pf_faaliyet').insert({
      bag_id: girdi.bagId,
      sira_no: i + 1,
      faaliyet_adi: f.ad.trim(),
    }).select('id').single()
    if (fHata) return { hata: fHata.message }
    if (!f.gostergeler.length) continue
    const { error: gHata } = await sb.from('performans_programi_pf_gosterge').insert(f.gostergeler.map((g, gi) => ({
      faaliyet_id: faaliyet.id,
      sira_no: gi + 1,
      gosterge_adi: g.ad.trim(),
      birim: g.birim,
      aciklama: g.aciklama.trim(),
      hesaplama_yontemi: g.hesaplama.trim(),
      t2_gerceklesme: g.t2,
      t1_planlanan: g.t1plan,
      t1_yil_sonu: g.t1son,
      t_hedef: g.thedef,
      t1_tahmin: g.t1tahmin,
      t2_tahmin: g.t2tahmin,
    })))
    if (gHata) return { hata: gHata.message }
  }
  revalidatePath(`/stratejik-yonetim/performans-programi/hedef/${girdi.bagId}`)
  return {}
}

export async function ppPerformansFaaliyetFormKaydet(girdi: {
  id?: number
  bagId: number
  ad: string
  aciklama: string
  gostergeler: PpGostergeGirdi[]
}): Promise<{ hata?: string }> {
  const faaliyetAdi = girdi.ad.trim()
  if (!Number.isFinite(girdi.bagId) || girdi.bagId <= 0) return { hata: 'Kayıt bulunamadı.' }
  if (!faaliyetAdi) return { hata: 'Performans faaliyeti adı girin.' }
  const birimler = new Set<string>(PP_BIRIMLER)
  for (const g of girdi.gostergeler) {
    if (!g.ad.trim() || !birimler.has(g.birim)) return { hata: 'Gösterge adı ve ölçü birimi zorunludur.' }
  }
  const supabase = await createClient()
  if (!(await ppOturum(supabase))) return { hata: 'Oturum gerekli.' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  let faaliyetId = girdi.id
  if (faaliyetId) {
    const { error } = await sb.from('performans_programi_pf_faaliyet').update({
      faaliyet_adi: faaliyetAdi,
      aciklama: girdi.aciklama.trim(),
    }).eq('id', faaliyetId).eq('bag_id', girdi.bagId)
    if (error) return { hata: error.message.includes('aciklama') ? 'Faaliyet açıklaması için 20261106140000_pp_faaliyet_aciklama_odenek.sql dosyasını çalıştırın.' : error.message }
    const { error: silHata } = await sb.from('performans_programi_pf_gosterge').delete().eq('faaliyet_id', faaliyetId)
    if (silHata) return { hata: silHata.message }
  } else {
    const { data: varOlan } = await sb.from('performans_programi_pf_faaliyet').select('sira_no').eq('bag_id', girdi.bagId)
    const nolar = ((varOlan ?? []) as { sira_no: number | null }[]).map(r => Number(r.sira_no)).filter(Number.isFinite)
    const sira = (nolar.length ? Math.max(...nolar) : 0) + 1
    const { data: faaliyet, error } = await sb.from('performans_programi_pf_faaliyet').insert({
      bag_id: girdi.bagId,
      sira_no: sira,
      faaliyet_adi: faaliyetAdi,
      aciklama: girdi.aciklama.trim(),
    }).select('id').single()
    if (error) return { hata: error.message.includes('aciklama') ? 'Faaliyet açıklaması için 20261106140000_pp_faaliyet_aciklama_odenek.sql dosyasını çalıştırın.' : error.message }
    faaliyetId = Number(faaliyet.id)
  }
  if (girdi.gostergeler.length) {
    const { error: gHata } = await sb.from('performans_programi_pf_gosterge').insert(girdi.gostergeler.map((g, gi) => ({
      faaliyet_id: faaliyetId,
      sira_no: gi + 1,
      gosterge_adi: g.ad.trim(),
      birim: g.birim,
      aciklama: g.aciklama.trim(),
      hesaplama_yontemi: g.hesaplama.trim(),
      t2_gerceklesme: g.t2,
      t1_planlanan: g.t1plan,
      t1_yil_sonu: g.t1son,
      t_hedef: g.thedef,
      t1_tahmin: g.t1tahmin,
      t2_tahmin: g.t2tahmin,
    })))
    if (gHata) return { hata: gHata.message }
  }
  revalidatePath(`/stratejik-yonetim/performans-programi/hedef/${girdi.bagId}`)
  return {}
}

export async function ppPerformansFaaliyetEkle(bagId: number, ad: string): Promise<{ hata?: string }> {
  const faaliyetAdi = ad.trim()
  if (!Number.isFinite(bagId) || bagId <= 0) return { hata: 'Kayıt bulunamadı.' }
  if (!faaliyetAdi) return { hata: 'Performans faaliyeti adı girin.' }
  const supabase = await createClient()
  if (!(await ppOturum(supabase))) return { hata: 'Oturum gerekli.' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data: varOlan } = await sb.from('performans_programi_pf_faaliyet').select('sira_no').eq('bag_id', bagId)
  const nolar = ((varOlan ?? []) as { sira_no: number | null }[]).map(r => Number(r.sira_no)).filter(Number.isFinite)
  const sira = (nolar.length ? Math.max(...nolar) : 0) + 1
  const { error } = await sb.from('performans_programi_pf_faaliyet').insert({
    bag_id: bagId,
    sira_no: sira,
    faaliyet_adi: faaliyetAdi,
  })
  if (error) return { hata: error.message }
  revalidatePath(`/stratejik-yonetim/performans-programi/hedef/${bagId}`)
  return {}
}

export async function ppPerformansFaaliyetAdGuncelle(id: number, bagId: number, ad: string): Promise<{ hata?: string }> {
  const faaliyetAdi = ad.trim()
  if (!faaliyetAdi) return { hata: 'Performans faaliyeti adı girin.' }
  const supabase = await createClient()
  if (!(await ppOturum(supabase))) return { hata: 'Oturum gerekli.' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('performans_programi_pf_faaliyet').update({
    faaliyet_adi: faaliyetAdi,
  }).eq('id', id).eq('bag_id', bagId)
  if (error) return { hata: error.message }
  revalidatePath(`/stratejik-yonetim/performans-programi/hedef/${bagId}`)
  return {}
}

export async function ppPerformansFaaliyetSatirSil(id: number, bagId: number): Promise<{ hata?: string }> {
  const supabase = await createClient()
  if (!(await ppOturum(supabase))) return { hata: 'Oturum gerekli.' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { count, error: sayHata } = await sb.from('performans_programi_pf_gosterge').select('id', { count: 'exact', head: true }).eq('faaliyet_id', id)
  if (sayHata) return { hata: sayHata.message }
  if ((count ?? 0) > 0) return { hata: BAGLI_KAYIT }
  const { count: odenekSay, error: odenekHata } = await sb.from('performans_programi_pf_odenek').select('id', { count: 'exact', head: true }).eq('pf_faaliyet_id', id)
  if (odenekHata && !String(odenekHata.message).includes('pf_odenek')) return { hata: odenekHata.message }
  if ((odenekSay ?? 0) > 0) return { hata: BAGLI_KAYIT }
  const { error } = await sb.from('performans_programi_pf_faaliyet').delete().eq('id', id).eq('bag_id', bagId)
  if (error) return { hata: error.message }
  const { data: kalan } = await sb.from('performans_programi_pf_faaliyet').select('id').eq('bag_id', bagId).order('sira_no')
  for (let i = 0; i < (kalan ?? []).length; i += 1) {
    await sb.from('performans_programi_pf_faaliyet').update({ sira_no: i + 1 }).eq('id', (kalan as { id: number }[])[i].id).eq('bag_id', bagId)
  }
  revalidatePath(`/stratejik-yonetim/performans-programi/hedef/${bagId}`)
  return {}
}
