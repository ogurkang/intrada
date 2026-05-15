'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type SosyalHakTip = 'rmy' | 'ivy' | 'izy'

export interface SosyalHakIzin {
  sira_no:  string
  sicil_no: string
  ad_soyad: string
  tur:      string
  tip:      SosyalHakTip
  ayrilis:  string
  baslama:  string
  gun:      number
}

export interface SosyalHakDetayData {
  donem:     { id: number; donem_adi: string | null; baslangic_tarihi: string; bitis_tarihi: string }
  aday:      SosyalHakIzin[]
  islenecek: SosyalHakIzin[]
}

const ZABITA_MUDURLUGU = 'Zabıta Müdürlüğü'
const IZY_IZIN_TURLERI = 'tur.ilike.%Yıllık%,tur.ilike.%Ölüm%,tur.ilike.%Evlilik%,tur.ilike.%Babalık%,tur.ilike.%Mehil%,tur.ilike.%Mazeret%,tur.ilike.%İdari%,tur.ilike.%Doğum Öncesi%,tur.ilike.%Doğum Sonrası%,tur.ilike.%Refakatçi%,tur.eq.Rapor,tur.eq.Heyet Raporu'

export async function sosyalHakDetayYukle(donem_id: number): Promise<SosyalHakDetayData | { hata: string }> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: donem } = await db
    .from('sosyal_hak_donem')
    .select('id, donem_adi, sira_no, baslangic_tarihi, bitis_tarihi')
    .eq('id', donem_id)
    .single()
  if (!donem) return { hata: 'Dönem bulunamadı.' }

  // Bu dönemin mevcut seçimleri
  const { data: secimRaw } = await db
    .from('sosyal_hak_secim')
    .select('izin_sira_no, tip, dahil')
    .eq('donem_id', donem_id)

  const buDonemSecili = new Map<string, SosyalHakTip>()
  ;(secimRaw ?? []).forEach((s: { dahil: boolean; izin_sira_no: string | null; tip: string }) => {
    if (s.dahil && s.izin_sira_no) buDonemSecili.set(s.izin_sira_no, s.tip as SosyalHakTip)
  })

  // Diğer dönemlerde seçili izinler (aday listesinden çıkarılacak)
  const { data: tumSecimRaw } = await db
    .from('sosyal_hak_secim')
    .select('donem_id, izin_sira_no, dahil')
  const digerDonemSecili = new Set<string>()
  ;(tumSecimRaw ?? []).forEach((s: { dahil: boolean; izin_sira_no: string | null; donem_id: number }) => {
    if (s.dahil && s.izin_sira_no && s.donem_id !== donem_id) digerDonemSecili.add(s.izin_sira_no)
  })

  // Kadro bilgileri: RMY (Memur), IVY (Vekil), IZY (Zabıta Müdürlüğü)
  const { data: kadroRaw } = await supabase
    .from('kadro_hareketleri')
    .select('asil, vekil, statu, kadro_mudurlugu, kadro_unvani, gorev_unvani, ayrilis_tarihi')
    .is('ayrilis_tarihi', null)

  const memurSiciller  = new Set<string>()
  const vekilSiciller  = new Set<string>()
  const zabitaSiciller = new Set<string>()
  const asilMuduruSiciller = new Set<string>()

  for (const k of kadroRaw ?? []) {
    const sicil     = (k.asil ?? k.vekil ?? '').trim()
    const vekilSicil = (k.vekil ?? '').trim()
    const mud        = (k.kadro_mudurlugu ?? '').trim()

    if (k.statu === 'Memur' && sicil) memurSiciller.add(sicil)

    if (vekilSicil) {
      vekilSiciller.add(vekilSicil)
      const asil = (k.asil ?? '').trim()
      if (asil) {
        const unvan = `${String(k.kadro_unvani ?? '').toLocaleLowerCase('tr-TR')} ${String(k.gorev_unvani ?? '').toLocaleLowerCase('tr-TR')}`
        if (unvan.includes('müdürü')) asilMuduruSiciller.add(asil)
      }
    }

    if (mud === ZABITA_MUDURLUGU && sicil) zabitaSiciller.add(sicil)
  }
  for (const s of asilMuduruSiciller) vekilSiciller.delete(s)

  type RawIzin = { sira_no: string | null; sicil_no: string | null; tur: string | null; ayrilis: string | null; baslama: string | null; gun: number | null }

  // RMY izinleri
  let rmyRaw: RawIzin[] = []
  if (memurSiciller.size > 0) {
    const { data } = await supabase
      .from('izin_hareketleri')
      .select('sira_no, sicil_no, tur, ayrilis, baslama, gun')
      .neq('durum', 'İptal Edildi')
      .in('tur', ['Rapor', 'Refakatçi Raporu', 'Refakatçi İzni'])
      .in('sicil_no', Array.from(memurSiciller))
      .order('baslama')
      .limit(500)
    rmyRaw = (data ?? []) as RawIzin[]
  }

  // IVY izinleri
  let ivyRaw: RawIzin[] = []
  if (vekilSiciller.size > 0) {
    const { data } = await supabase
      .from('izin_hareketleri')
      .select('sira_no, sicil_no, tur, ayrilis, baslama, gun')
      .neq('durum', 'İptal Edildi')
      .in('sicil_no', Array.from(vekilSiciller))
      .order('baslama')
      .limit(500)
    ivyRaw = (data ?? []) as RawIzin[]
  }

  // IZY izinleri
  let izyRaw: RawIzin[] = []
  if (zabitaSiciller.size > 0) {
    const { data } = await supabase
      .from('izin_hareketleri')
      .select('sira_no, sicil_no, tur, ayrilis, baslama, gun')
      .neq('durum', 'İptal Edildi')
      .or(IZY_IZIN_TURLERI)
      .in('sicil_no', Array.from(zabitaSiciller))
      .order('baslama')
      .limit(500)
    izyRaw = (data ?? []) as RawIzin[]
  }

  // Çalışan adları
  const tumSiciller = new Set<string>()
  ;[...rmyRaw, ...ivyRaw, ...izyRaw].forEach(i => { if (i.sicil_no) tumSiciller.add(i.sicil_no) })
  const adMap: Record<string, string> = {}
  if (tumSiciller.size > 0) {
    const { data: calisanlar } = await supabase
      .from('calisan')
      .select('sicil_no, ad_soyad')
      .in('sicil_no', Array.from(tumSiciller))
    ;(calisanlar ?? []).forEach(c => { if (c.sicil_no) adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no })
  }

  function toIzin(raw: RawIzin[], tip: SosyalHakTip): SosyalHakIzin[] {
    return raw
      .filter(i => i.sira_no && i.ayrilis && i.baslama)
      .map(i => ({
        sira_no:  i.sira_no!,
        sicil_no: i.sicil_no ?? '',
        ad_soyad: adMap[i.sicil_no ?? ''] ?? i.sicil_no ?? '',
        tur:      i.tur ?? '',
        tip,
        ayrilis:  i.ayrilis!,
        baslama:  i.baslama!,
        gun:      i.gun ?? 0,
      }))
  }

  // Bir sira_no birden fazla listede görünebilir (ör. Rapor türü hem RMY hem IZY filtresiyle eşleşir).
  // Unique kısıtı korumak için sira_no bazında deduplicate et; önce gelen tipin önceliği var.
  const seenSiraNo = new Set<string>()
  const tumIzinler: SosyalHakIzin[] = [
    ...toIzin(rmyRaw, 'rmy'),
    ...toIzin(ivyRaw, 'ivy'),
    ...toIzin(izyRaw, 'izy'),
  ].filter(iz => {
    if (seenSiraNo.has(iz.sira_no)) return false
    seenSiraNo.add(iz.sira_no)
    return true
  })

  const aday:      SosyalHakIzin[] = []
  const islenecek: SosyalHakIzin[] = []

  for (const iz of tumIzinler) {
    if (buDonemSecili.has(iz.sira_no)) {
      islenecek.push({ ...iz, tip: buDonemSecili.get(iz.sira_no) ?? iz.tip })
    } else if (!digerDonemSecili.has(iz.sira_no)) {
      aday.push(iz)
    }
  }

  return {
    donem: {
      id: donem.id,
      donem_adi: donem.donem_adi ?? donem.sira_no,
      baslangic_tarihi: donem.baslangic_tarihi,
      bitis_tarihi: donem.bitis_tarihi,
    },
    aday,
    islenecek,
  }
}

export async function sosyalHakSecimleriKaydet(
  donem_id: number,
  siraNoList: { sira_no: string; tip: SosyalHakTip }[]
): Promise<{ hata?: string }> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  await db.from('sosyal_hak_secim').delete().eq('donem_id', donem_id)

  if (siraNoList.length > 0) {
    // Olası çift kayıt (aynı sira_no farklı tipte görünebilir) → unique kısıtı korumak için deduplicate
    const seen = new Set<string>()
    const tekSiraNoList = siraNoList.filter(({ sira_no }) => {
      if (seen.has(sira_no)) return false
      seen.add(sira_no)
      return true
    })
    const { error } = await db.from('sosyal_hak_secim').insert(
      tekSiraNoList.map(({ sira_no, tip }) => ({
        donem_id,
        izin_sira_no: sira_no,
        tip,
        dahil: true,
      }))
    )
    if (error) return { hata: (error as { message: string }).message }
  }

  revalidatePath(`/kesintiler/sosyal-hak/${donem_id}`)
  revalidatePath('/kesintiler/sosyal-hak')
  return {}
}
