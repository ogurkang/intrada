'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { revalidatePersonelDetayPaths } from '@/lib/revalidate-personel'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'
import { tasinirGoreviNormalize } from '@/lib/tasinir-gorevi'
import {
  TASINIR_GOREV_TAMAM_MESAJI,
  ayniMudurlukteAktifGorevliler,
  gorevMudurluguBul,
  tasinirGorevAktiflestir,
  tasinirGorevCakismaUyari,
  tasinirGorevPasiflestir,
  tasinirTutarHaritasi,
  type TasinirGorevCakisan,
} from '@/lib/tasinir-gorev-bildirim'
import type { Database, Tables } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

function revalidateTasinirBildirim(sicil_no?: string) {
    revalidatePath('/bildirim/tasinir-gorev')
  revalidatePath('/bildirim')
  revalidatePath('/tanimlar/kazanc-bilgi/sapma')
  revalidatePath('/terfi/bilgiler')
  revalidatePath('/rapor/tasinir-gorevi-olan-personel-liste')
  if (sicil_no) {
    void revalidatePersonelDetayPaths(sicil_no)
    revalidatePath(`/personel/${sicil_no}`)
  }
}

export type TasinirGorevKaydetSonuc = {
  hata?: string
  uyari?: string
  tamam?: string
}

export type TasinirGorevCakismaSecim = 'evet' | 'devret'

async function cakisanlariPasiflestir(
  supabase: SupabaseClient<Database>,
  cakisanlar: TasinirGorevCakisan[],
  tutarByGorev: Record<string, string>,
  bugun: string,
): Promise<{ hata?: string }> {
  for (const cakisan of cakisanlar) {
    const { data: eski } = await supabase
      .from('tasinir_gorev_bildirimleri')
      .select('*')
      .eq('id', cakisan.id)
      .maybeSingle()
    if (!eski) continue
    const p = await tasinirGorevPasiflestir(supabase, eski as Tables<'tasinir_gorev_bildirimleri'>, tutarByGorev, bugun)
    if (p.hata) return { hata: p.hata }
    await writePersonelAuditLogSafe(supabase, {
      sicil_no: cakisan.sicil_no,
      modul: 'taşınır görev',
      islem: 'Güncelle',
      ozet: `${cakisan.gorev_adi} görevi pasifleştirildi.`,
      ref_table: 'tasinir_gorev_bildirimleri',
      ref_id: String(cakisan.id),
      onceki: { aktif: true },
      sonraki: { aktif: false },
    })
    revalidateTasinirBildirim(cakisan.sicil_no)
  }
  return {}
}

export async function tasinirGorevEkle(
  sicil_no: string,
  gorevAdi: string,
  secim?: TasinirGorevCakismaSecim,
): Promise<TasinirGorevKaydetSonuc> {
  const gorev = tasinirGoreviNormalize(gorevAdi)
  const sicil = sicil_no.trim()
  if (!sicil) return { hata: 'Personel seçin.' }
  if (!gorev) return { hata: 'Taşınır görevi seçin.' }

  const supabase = await createClient()
  const { data: calisan } = await supabase
    .from('calisan')
    .select('sicil_no, ad_soyad, tasinir_gorevi')
    .eq('sicil_no', sicil)
    .maybeSingle()
  if (!calisan) return { hata: 'Personel bulunamadı.' }

  if (tasinirGoreviNormalize(calisan.tasinir_gorevi) === gorev) {
    return { hata: 'Bu personel zaten seçilen görevde.' }
  }

  const mudurluk = await gorevMudurluguBul(supabase, sicil)
  const cakisanlar = await ayniMudurlukteAktifGorevliler(supabase, gorev, mudurluk, sicil)
  if (cakisanlar.length && !secim) {
    return { uyari: tasinirGorevCakismaUyari(cakisanlar) }
  }

  const tutarByGorev = await tasinirTutarHaritasi(supabase)
  const bugun = new Date().toISOString().slice(0, 10)

  if (cakisanlar.length && secim === 'devret') {
    const p = await cakisanlariPasiflestir(supabase, cakisanlar, tutarByGorev, bugun)
    if (p.hata) return { hata: p.hata }
  }

  const a = await tasinirGorevAktiflestir(supabase, sicil, gorev, mudurluk, tutarByGorev, bugun)
  if (a.hata) return { hata: a.hata }

  await writePersonelAuditLogSafe(supabase, {
    sicil_no: sicil,
    modul: 'taşınır görev',
    islem: 'Ekle',
    ozet: `${gorev} görevi tanımlandı.`,
    ref_table: 'tasinir_gorev_bildirimleri',
    ref_id: String(a.id ?? sicil),
    sonraki: { gorev_adi: gorev, aktif: true },
  })
  revalidateTasinirBildirim(sicil)
  return { tamam: TASINIR_GOREV_TAMAM_MESAJI }
}

export async function tasinirGorevDurumGuncelle(
  id: number,
  aktif: boolean,
  secim?: TasinirGorevCakismaSecim,
): Promise<TasinirGorevKaydetSonuc> {
  const supabase = await createClient()
  const { data: kayit } = await supabase.from('tasinir_gorev_bildirimleri').select('*').eq('id', id).maybeSingle()
  if (!kayit) return { hata: 'Kayıt bulunamadı.' }
  if (kayit.aktif === aktif) return {}

  const tutarByGorev = await tasinirTutarHaritasi(supabase)
  const bugun = new Date().toISOString().slice(0, 10)
  const gorev = tasinirGoreviNormalize(kayit.gorev_adi)
  if (!gorev) return { hata: 'Görev bilgisi geçersiz.' }

  if (!aktif) {
    const p = await tasinirGorevPasiflestir(supabase, kayit as Tables<'tasinir_gorev_bildirimleri'>, tutarByGorev, bugun)
    if (p.hata) return { hata: p.hata }
    await writePersonelAuditLogSafe(supabase, {
      sicil_no: kayit.sicil_no,
      modul: 'taşınır görev',
      islem: 'Güncelle',
      ozet: `${kayit.gorev_adi} görevi pasifleştirildi.`,
      ref_table: 'tasinir_gorev_bildirimleri',
      ref_id: String(id),
      onceki: { aktif: true },
      sonraki: { aktif: false },
    })
    revalidateTasinirBildirim(kayit.sicil_no)
    return {}
  }

  const mudurluk = (kayit.gorev_mudurlugu ?? '').trim() || (await gorevMudurluguBul(supabase, kayit.sicil_no))
  const cakisanlar = await ayniMudurlukteAktifGorevliler(supabase, gorev, mudurluk, kayit.sicil_no)
  if (cakisanlar.length && !secim) {
    return { uyari: tasinirGorevCakismaUyari(cakisanlar) }
  }
  if (cakisanlar.length && secim === 'devret') {
    const p = await cakisanlariPasiflestir(supabase, cakisanlar, tutarByGorev, bugun)
    if (p.hata) return { hata: p.hata }
  }

  const { data: kendiAktif } = await supabase
    .from('tasinir_gorev_bildirimleri')
    .select('*')
    .eq('sicil_no', kayit.sicil_no)
    .eq('aktif', true)
  for (const k of kendiAktif ?? []) {
    if (k.id === id) continue
    const p = await tasinirGorevPasiflestir(supabase, k as Tables<'tasinir_gorev_bildirimleri'>, tutarByGorev, bugun)
    if (p.hata) return { hata: p.hata }
  }

  const a = await tasinirGorevAktiflestir(supabase, kayit.sicil_no, gorev, mudurluk, tutarByGorev, bugun)
  if (a.hata) return { hata: a.hata }
  await writePersonelAuditLogSafe(supabase, {
    sicil_no: kayit.sicil_no,
    modul: 'taşınır görev',
    islem: 'Güncelle',
    ozet: `${gorev} görevi yeniden aktifleştirildi.`,
    ref_table: 'tasinir_gorev_bildirimleri',
    ref_id: String(id),
    onceki: { aktif: false },
    sonraki: { aktif: true },
  })
  revalidateTasinirBildirim(kayit.sicil_no)
  return { tamam: TASINIR_GOREV_TAMAM_MESAJI }
}
