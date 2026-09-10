import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Tables } from '@/types/database'
import { kazancPuanDelta, parseKazancPuan, tasinirTutarBul } from '@/lib/kazanc-tasinir-yetkili'
import { tasinirGoreviNormalize, type TasinirGorevi } from '@/lib/tasinir-gorevi'
import { writeTerfiAuditLogSafe } from '@/lib/terfi-audit'

export const TASINIR_GOREV_TAMAM_MESAJI =
  'Görevlendirilen personele göreve tanımlanmış yan ödeme puanı eklenmiştir. Lütfen kontrol ediniz.'

export type TasinirGorevCakisan = {
  id: number
  sicil_no: string
  ad_soyad: string
  gorev_adi: string
}

export function tasinirGorevCakismaUyari(kisiler: TasinirGorevCakisan[]): string {
  const parcalar = kisiler.map(k => `${k.sicil_no} sicil numaralı ${k.ad_soyad}`)
  let kim = parcalar[0] ?? ''
  if (parcalar.length === 2) kim = `${parcalar[0]} ve ${parcalar[1]}`
  else if (parcalar.length > 2) kim = `${parcalar.slice(0, -1).join(', ')} ve ${parcalar[parcalar.length - 1]}`
  return `Bu müdürlükte ${kim} isimli personel de aynı görevi yürütüyor. İlerlemek istiyor musunuz?`
}

function terfiKaydiSec(kayitlar: Tables<'terfi_hareketleri'>[]): Tables<'terfi_hareketleri'> | null {
  if (!kayitlar.length) return null
  const kapsamIci = kayitlar.filter(k => !k.kapsam_disi)
  const havuz = kapsamIci.length ? kapsamIci : kayitlar
  return [...havuz].sort((a, b) => b.kayit_zamani.localeCompare(a.kayit_zamani))[0] ?? null
}

export async function gorevMudurluguBul(
  supabase: SupabaseClient<Database>,
  sicil_no: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('personel_kadro_ozet')
    .select('gorev_mudurlugu, kadro_mudurlugu')
    .eq('sicil_no', sicil_no)
    .maybeSingle()
  const g = String(data?.gorev_mudurlugu ?? '').trim()
  const k = String(data?.kadro_mudurlugu ?? '').trim()
  return g || k || null
}

export async function tasinirTutarHaritasi(
  supabase: SupabaseClient<Database>,
): Promise<Record<string, string>> {
  const { data } = await supabase.from('tanim_kazanc_tasinir_yetkili').select('gorev_adi, tutar')
  const map: Record<string, string> = {}
  for (const t of data ?? []) {
    const gorev = tasinirGoreviNormalize(t.gorev_adi)
    const puan = String(t.tutar ?? '').trim()
    if (gorev && puan) map[gorev] = puan
  }
  return map
}

async function terfiYanOdemeUygula(
  supabase: SupabaseClient<Database>,
  sicil_no: string,
  delta: number,
  ozet: string,
): Promise<{ hata?: string }> {
  if (!delta) return {}
  const { data: kayitlar } = await supabase.from('terfi_hareketleri').select('*').eq('sicil_no', sicil_no)
  const sec = terfiKaydiSec((kayitlar ?? []) as Tables<'terfi_hareketleri'>[])
  if (!sec) return { hata: `${sicil_no} sicil için terfi kaydı bulunamadı; yan ödeme güncellenemedi.` }
  const yeni = kazancPuanDelta(sec.yan_odeme, delta)
  const { error } = await supabase.from('terfi_hareketleri').update({ yan_odeme: yeni }).eq('id', sec.id)
  if (error) return { hata: error.message }
  await writeTerfiAuditLogSafe(supabase, {
    sicil_no,
    terfiId: sec.id,
    islem: 'Güncelle',
    ozet,
    onceki: { yan_odeme: sec.yan_odeme },
    sonraki: { yan_odeme: yeni },
  })
  return {}
}

export async function tasinirGorevPasiflestir(
  supabase: SupabaseClient<Database>,
  kayit: Tables<'tasinir_gorev_bildirimleri'>,
  tutarByGorev: Record<string, string>,
  bugun: string,
): Promise<{ hata?: string }> {
  if (!kayit.aktif) return {}
  const gorev = tasinirGoreviNormalize(kayit.gorev_adi)
  const ek = gorev ? tasinirTutarBul(gorev, tutarByGorev) : null
  const ekN = parseKazancPuan(ek) ?? 0

  const { error } = await supabase
    .from('tasinir_gorev_bildirimleri')
    .update({ aktif: false, bitis_tarihi: bugun })
    .eq('id', kayit.id)
  if (error) return { hata: error.message }

  const { data: calisan } = await supabase
    .from('calisan')
    .select('tasinir_gorevi, tasinir_yan_odeme_uygulandi')
    .eq('sicil_no', kayit.sicil_no)
    .maybeSingle()

  if (tasinirGoreviNormalize(calisan?.tasinir_gorevi) === gorev) {
    const { error: cErr } = await supabase
      .from('calisan')
      .update({ tasinir_gorevi: null, tasinir_yan_odeme_uygulandi: false })
      .eq('sicil_no', kayit.sicil_no)
    if (cErr) return { hata: cErr.message }
  }

  if (kayit.yan_odeme_uygulandi && ekN) {
    const res = await terfiYanOdemeUygula(
      supabase,
      kayit.sicil_no,
      -ekN,
      `Taşınır görev (${kayit.gorev_adi}) ayrılışı — yan ödeme puanı güncellendi`,
    )
    if (res.hata) return res
  }

  await supabase.from('tasinir_gorev_bildirimleri').update({ yan_odeme_uygulandi: false }).eq('id', kayit.id)
  return {}
}

export async function tasinirGorevAktiflestir(
  supabase: SupabaseClient<Database>,
  sicil_no: string,
  gorev: TasinirGorevi,
  mudurluk: string | null,
  tutarByGorev: Record<string, string>,
  bugun: string,
): Promise<{ hata?: string; id?: number }> {

  const { data: kendiAktif } = await supabase
    .from('tasinir_gorev_bildirimleri')
    .select('*')
    .eq('sicil_no', sicil_no)
    .eq('aktif', true)

  for (const k of kendiAktif ?? []) {
    const res = await tasinirGorevPasiflestir(supabase, k as Tables<'tasinir_gorev_bildirimleri'>, tutarByGorev, bugun)
    if (res.hata) return res
  }

  const { data: inserted, error } = await supabase
    .from('tasinir_gorev_bildirimleri')
    .insert({
      sicil_no,
      gorev_adi: gorev,
      gorev_mudurlugu: mudurluk,
      aktif: true,
      // Terfi kaydı kadro puanında kalır; TKY ekranda eklenir. Terfiye yazmak
      // hem çifte saymaya hem (yazılamazsa) bayrak yüzünden 2775 görünmesine yol açıyordu.
      yan_odeme_uygulandi: false,
      baslangic_tarihi: bugun,
      bitis_tarihi: null,
    })
    .select('id')
    .single()
  if (error) return { hata: error.message }

  const { error: cErr } = await supabase
    .from('calisan')
    .update({ tasinir_gorevi: gorev, tasinir_yan_odeme_uygulandi: false })
    .eq('sicil_no', sicil_no)
  if (cErr) return { hata: cErr.message }

  if (!inserted?.id) return {}
  return { id: inserted.id }
}

export async function ayniMudurlukteAktifGorevliler(
  supabase: SupabaseClient<Database>,
  gorev: TasinirGorevi,
  mudurluk: string | null,
  haricSicil?: string,
): Promise<TasinirGorevCakisan[]> {
  const { data: aktifler } = await supabase
    .from('tasinir_gorev_bildirimleri')
    .select('id, sicil_no, gorev_adi, gorev_mudurlugu')
    .eq('gorev_adi', gorev)
    .eq('aktif', true)

  const hedef = String(mudurluk ?? '').trim().toLocaleLowerCase('tr-TR')
  const adaylar: { id: number; sicil_no: string; gorev_adi: string }[] = []
  for (const a of aktifler ?? []) {
    if (haricSicil && a.sicil_no === haricSicil) continue
    let mud = String(a.gorev_mudurlugu ?? '').trim()
    if (!mud) mud = (await gorevMudurluguBul(supabase, a.sicil_no)) ?? ''
    if (hedef && mud && mud.toLocaleLowerCase('tr-TR') !== hedef) continue
    adaylar.push({ id: a.id, sicil_no: a.sicil_no, gorev_adi: a.gorev_adi })
  }
  if (!adaylar.length) return []

  const siciller = [...new Set(adaylar.map(a => a.sicil_no))]
  const { data: calisanlar } = await supabase.from('calisan').select('sicil_no, ad_soyad').in('sicil_no', siciller)
  const adBySicil = new Map((calisanlar ?? []).map(c => [c.sicil_no, c.ad_soyad]))
  return adaylar.map(a => ({
    id: a.id,
    sicil_no: a.sicil_no,
    ad_soyad: adBySicil.get(a.sicil_no) ?? a.sicil_no,
    gorev_adi: a.gorev_adi,
  }))
}
