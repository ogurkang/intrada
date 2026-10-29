'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getKullaniciGorevMudurlukleri } from '@/lib/kullanici-mudurluk'
import { ppMaliyetSeciciMi, ppNorm, ppOturum } from '@/lib/pp-erisim'

function paraYazi(n: number): string {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function kaydedenAd(supabase: Awaited<ReturnType<typeof createClient>>, ot: NonNullable<Awaited<ReturnType<typeof ppOturum>>>): Promise<string> {
  if (ot.access.mode === 'kullanici') {
    const { data } = await supabase.from('calisan').select('ad_soyad').eq('sicil_no', ot.access.sicilNo).maybeSingle()
    const ad = String((data as { ad_soyad?: string } | null)?.ad_soyad ?? '').trim()
    if (ad) return ad
  }
  return String(ot.user.email ?? '').trim() || 'Kullanıcı'
}

export async function ppAltProgramHedefEkle(altProgramId: number, yil: number, programId: number, altHedefId: number): Promise<{ hata?: string }> {
  if (!Number.isFinite(altHedefId)) return { hata: 'Performans hedefi seçin.' }
  const supabase = await createClient()
  const ot = await ppOturum(supabase)
  if (!ot) return { hata: 'Oturum gerekli.' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { error } = await sb.from('performans_programi_alt_program_hedef').insert({
    alt_program_id: altProgramId,
    alt_hedef_id: altHedefId,
  })
  if (error) {
    if (String(error.message).includes('duplicate') || String(error.code) === '23505') {
      return { hata: 'Bu performans hedefi zaten bağlı.' }
    }
    return { hata: error.message }
  }
  revalidatePath(`/stratejik-yonetim/performans-programi/islemler/${yil}/${programId}/${altProgramId}`)
  revalidatePath(`/stratejik-yonetim/performans-programi/islemler/${yil}/${programId}`)
  return {}
}

export async function ppOzelFaaliyetEkle(
  altProgramId: number,
  yil: number,
  programId: number,
  altHedefId: number,
  faaliyetAdi: string,
  siraNo: number | null,
): Promise<{ hata?: string }> {
  const ad = faaliyetAdi.trim()
  if (!ad) return { hata: 'Faaliyet adı girin.' }
  const supabase = await createClient()
  const ot = await ppOturum(supabase)
  if (!ot) return { hata: 'Oturum gerekli.' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data: bag } = await sb
    .from('performans_programi_alt_program_hedef')
    .select('id')
    .eq('alt_program_id', altProgramId)
    .eq('alt_hedef_id', altHedefId)
    .maybeSingle()
  if (!bag) return { hata: 'Bu performans hedefi alt programa bağlı değil.' }
  let sira = siraNo
  if (sira == null) {
    const [{ data: plan }, { data: ozel }] = await Promise.all([
      sb.from('stratejik_plan_faaliyet').select('sira_no').eq('alt_hedef_id', altHedefId),
      sb.from('performans_programi_ozel_faaliyet').select('sira_no').eq('alt_program_id', altProgramId).eq('alt_hedef_id', altHedefId).eq('yil', yil),
    ])
    const nolar = [...(plan ?? []), ...(ozel ?? [])].map((r: { sira_no: number | null }) => Number(r.sira_no)).filter(Number.isFinite)
    sira = (nolar.length ? Math.max(...nolar) : 0) + 1
  }
  const { data: eklenen, error } = await sb.from('performans_programi_ozel_faaliyet').insert({
    alt_program_id: altProgramId,
    alt_hedef_id: altHedefId,
    yil,
    sira_no: sira,
    faaliyet_adi: ad,
  }).select('id').maybeSingle()
  if (error) return { hata: error.message }
  await sb.from('performans_programi_maliyet_log').insert({
    yil,
    alt_program_id: altProgramId,
    alt_hedef_id: altHedefId,
    ozel_faaliyet_id: eklenen?.id ?? null,
    metin: `Faaliyet eklendi: ${ad}`,
    kullanici_adi: await kaydedenAd(supabase, ot),
  })
  revalidatePath(`/stratejik-yonetim/performans-programi/islemler/${yil}/${programId}/${altProgramId}`)
  return {}
}

export async function ppFaaliyetMaliyetKaydet(
  altProgramId: number,
  yil: number,
  programId: number,
  faaliyetId: number,
  kalemler: { butce_kodu_id: number; tutar: number | null }[],
  ozel = false,
): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const ot = await ppOturum(supabase)
  if (!ot) return { hata: 'Oturum gerekli.' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data: faaliyet } = ozel
    ? await sb.from('performans_programi_ozel_faaliyet').select('id, alt_hedef_id').eq('id', faaliyetId).eq('alt_program_id', altProgramId).eq('yil', yil).maybeSingle()
    : await sb.from('stratejik_plan_faaliyet').select('id, alt_hedef_id').eq('id', faaliyetId).maybeSingle()
  const altHedefId = Number(faaliyet?.alt_hedef_id)
  if (!Number.isFinite(altHedefId)) return { hata: 'Faaliyet bulunamadı.' }
  const { data: bag } = await sb
    .from('performans_programi_alt_program_hedef')
    .select('id')
    .eq('alt_program_id', altProgramId)
    .eq('alt_hedef_id', altHedefId)
    .maybeSingle()
  if (!bag) return { hata: 'Bu faaliyet bu alt programa bağlı değil.' }
  const { data: altHedef } = await sb
    .from('stratejik_plan_alt_hedef')
    .select('mudurluk')
    .eq('id', altHedefId)
    .maybeSingle()
  const mudurluk = String(altHedef?.mudurluk ?? '').trim()
  if (!mudurluk) return { hata: 'Müdürlük bilgisi bulunamadı.' }
  const secici = await ppMaliyetSeciciMi(supabase, ot.access)
  if (!secici) {
    if (ot.access.mode !== 'kullanici') return { hata: 'Bu kayıt için yetkiniz yok.' }
    const { mudurlukler } = await getKullaniciGorevMudurlukleri(supabase, ot.access.sicilNo)
    if (!mudurlukler.some(m => ppNorm(m) === ppNorm(mudurluk))) return { hata: 'Bu müdürlük için yetkiniz yok.' }
  }

  const silinecek = kalemler.filter(k => k.tutar == null && Number.isFinite(k.butce_kodu_id)).map(k => k.butce_kodu_id)
  const yazilacak = kalemler.filter(k => k.tutar != null && Number.isFinite(k.butce_kodu_id) && Number.isFinite(k.tutar))
  const butceTablo = ozel ? 'performans_programi_ozel_faaliyet_butce' : 'performans_programi_faaliyet_butce'
  const faaliyetKolon = ozel ? 'ozel_faaliyet_id' : 'faaliyet_id'
  const { data: eskiRaw } = await sb.from(butceTablo).select('butce_kodu_id, tutar').eq(faaliyetKolon, faaliyetId).eq('yil', yil).eq('mudurluk', mudurluk)
  const eski = new Map<number, number>((eskiRaw ?? []).map((r: { butce_kodu_id: number; tutar: number }) => [Number(r.butce_kodu_id), Number(r.tutar ?? 0)]))
  if (silinecek.length) {
    const { error } = await sb.from(butceTablo).delete().eq(faaliyetKolon, faaliyetId).eq('yil', yil).eq('mudurluk', mudurluk).in('butce_kodu_id', silinecek)
    if (error) return { hata: error.message }
  }
  if (yazilacak.length) {
    const { error } = await sb.from(butceTablo).upsert(
      yazilacak.map(k => ({
        [faaliyetKolon]: faaliyetId,
        butce_kodu_id: k.butce_kodu_id,
        yil,
        mudurluk,
        tutar: k.tutar,
        sonraki_yil_butce_1: k.tutar,
        updated_by: ot.user.id,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: `${faaliyetKolon},butce_kodu_id,yil,mudurluk` },
    )
    if (error) return { hata: error.message }
  }
  const kodIds = [...new Set([...yazilacak.map(k => k.butce_kodu_id), ...silinecek])]
  const { data: kodRaw } = kodIds.length
    ? await sb.from('performans_programi_butce_kodu').select('id, ekonomik_kod, hesap_adi').in('id', kodIds)
    : { data: [] }
  const kodAd = new Map<number, string>((kodRaw ?? []).map((k: { id: number; ekonomik_kod: string; hesap_adi: string }) => [k.id, `${k.ekonomik_kod} ${k.hesap_adi}`]))
  const kullanici = await kaydedenAd(supabase, ot)
  const loglar: { metin: string }[] = []
  for (const k of yazilacak) {
    const once = eski.has(k.butce_kodu_id) ? eski.get(k.butce_kodu_id) : undefined
    if (once != null && once === k.tutar) continue
    const ad = kodAd.get(k.butce_kodu_id) ?? 'Ödenek'
    loglar.push({ metin: once == null ? `${ad}: ${paraYazi(k.tutar ?? 0)}` : `${ad}: ${paraYazi(once)} → ${paraYazi(k.tutar ?? 0)}` })
  }
  for (const id of silinecek) {
    if (!eski.has(id)) continue
    loglar.push({ metin: `${kodAd.get(id) ?? 'Ödenek'} silindi (${paraYazi(eski.get(id) ?? 0)})` })
  }
  if (loglar.length) {
    const { error: logHata } = await sb.from('performans_programi_maliyet_log').insert(loglar.map(l => ({
      yil,
      alt_program_id: altProgramId,
      alt_hedef_id: altHedefId,
      faaliyet_id: ozel ? null : faaliyetId,
      ozel_faaliyet_id: ozel ? faaliyetId : null,
      metin: l.metin,
      kullanici_adi: kullanici,
    })))
    if (logHata) return { hata: logHata.message }
  }

  const kok = `/stratejik-yonetim/performans-programi/islemler/${yil}/${programId}/${altProgramId}`
  revalidatePath(kok)
  revalidatePath(`${kok}/maliyet/${faaliyetId}`)
  return {}
}
