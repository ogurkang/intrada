'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getKullaniciGorevMudurlukleri } from '@/lib/kullanici-mudurluk'
import { ppMaliyetSeciciMi, ppNorm, ppOturum } from '@/lib/pp-erisim'
import {
  PP_BIRIMLER,
  ppPerformansYol,
  type PpFaaliyetGirdi,
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
      mudurluk: alt.mudurluk,
      etiket: `SA ${amac?.kodu ?? '—'}  SH ${hedef?.kodu ?? '—'}  PH ${alt.kodu}  ${alt.alt_hedef_adi}`,
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
  if (!kodu || !ad) return { hata: 'Alt program kodu ve adı zorunludur.' }
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
  if (Number.isFinite(altId) && altId > 0) {
    const { error } = await sb.from('performans_programi_alt_program').update({
      sira_no: girdi.sira,
      kodu,
      alt_program_adi: ad,
    }).eq('id', altId).eq('program_id', girdi.programId)
    if (error) return { hata: error.message }
    await sb.from('performans_programi_alt_program_hedef').delete().eq('alt_program_id', altId)
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
  }
  const { data: bag, error: bagHata } = await sb.from('performans_programi_alt_program_hedef').insert({
    alt_program_id: altId,
    alt_hedef_id: girdi.altHedefId,
    gerekce: girdi.gerekce.trim(),
  }).select('id').single()
  if (bagHata) {
    return { hata: tabloYok(bagHata.message) ? 'Kayıt tablosu yok. 20261105120000_pp_iliski_yeni.sql dosyasını çalıştırın.' : bagHata.message }
  }
  const bagId = Number(bag?.id)
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
