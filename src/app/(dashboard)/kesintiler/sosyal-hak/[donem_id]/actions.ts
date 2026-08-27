'use server'

import { createClient } from '@/lib/supabase/server'
import { fetchAllPaged } from '@/lib/supabase-sayfala'
import {
  buildMemurSiciller,
  buildVekilSiciller,
  buildZabitaSiciller,
  RMY_IZIN_TURLERI,
  IZY_IZIN_TURLERI_OR,
  sosyalHakTipsForIzin,
} from '@/lib/kesintiler-kadro'
import { revalidatePath } from 'next/cache'

export type SosyalHakTip = 'rmy' | 'ivy' | 'izy'

export interface SosyalHakIzin {
  sira_no:  string
  sicil_no: string
  ad_soyad: string
  tur:      string
  /** Sosyal Hak ekranında geçerli modül(ler); örn. ['rmy','izy'] */
  tips:     SosyalHakTip[]
  ayrilis:  string
  baslama:  string
  gun:      number
}

export interface SosyalHakDetayData {
  donem:     { id: number; donem_adi: string | null; baslangic_tarihi: string; bitis_tarihi: string }
  aday:      SosyalHakIzin[]
  islenecek: SosyalHakIzin[]
}

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

  const { data: secimRaw } = await db
    .from('sosyal_hak_secim')
    .select('izin_sira_no, tip, dahil')
    .eq('donem_id', donem_id)

  const buDonemSecili = new Map<string, SosyalHakTip[]>()
  ;(secimRaw ?? []).forEach((s: { dahil: boolean; izin_sira_no: string | null; tip: string }) => {
    if (!s.dahil || !s.izin_sira_no) return
    const mevcut = buDonemSecili.get(s.izin_sira_no) ?? []
    if (!mevcut.includes(s.tip as SosyalHakTip)) mevcut.push(s.tip as SosyalHakTip)
    buDonemSecili.set(s.izin_sira_no, mevcut)
  })

  const { data: tumSecimRaw } = await db
    .from('sosyal_hak_secim')
    .select('donem_id, izin_sira_no, dahil')
  const digerDonemSecili = new Set<string>()
  ;(tumSecimRaw ?? []).forEach((s: { dahil: boolean; izin_sira_no: string | null; donem_id: number }) => {
    if (s.dahil && s.izin_sira_no && s.donem_id !== donem_id) digerDonemSecili.add(s.izin_sira_no)
  })

  const [memurSiciller, vekilSiciller, zabitaSiciller] = await Promise.all([
    buildMemurSiciller(supabase),
    buildVekilSiciller(supabase),
    buildZabitaSiciller(supabase),
  ])

  type RawIzin = { sira_no: string | null; sicil_no: string | null; tur: string | null; ayrilis: string | null; baslama: string | null; gun: number | null }

  let rmyRaw: RawIzin[] = []
  if (memurSiciller.size > 0) {
    const { data } = await fetchAllPaged((from, to) =>
      supabase
        .from('izin_hareketleri')
        .select('sira_no, sicil_no, tur, ayrilis, baslama, gun, yil')
        .neq('yil', 2025)
        .neq('durum', 'İptal Edildi')
        .in('tur', [...RMY_IZIN_TURLERI])
        .in('sicil_no', Array.from(memurSiciller))
        .order('id')
        .range(from, to),
    )
    rmyRaw = (data ?? []) as RawIzin[]
  }

  let ivyRaw: RawIzin[] = []
  if (vekilSiciller.size > 0) {
    const { data } = await fetchAllPaged((from, to) =>
      supabase
        .from('izin_hareketleri')
        .select('sira_no, sicil_no, tur, ayrilis, baslama, gun, yil')
        .neq('yil', 2025)
        .neq('durum', 'İptal Edildi')
        .in('sicil_no', Array.from(vekilSiciller))
        .order('id')
        .range(from, to),
    )
    ivyRaw = (data ?? []) as RawIzin[]
  }

  let izyRaw: RawIzin[] = []
  if (zabitaSiciller.size > 0) {
    const { data } = await fetchAllPaged((from, to) =>
      supabase
        .from('izin_hareketleri')
        .select('sira_no, sicil_no, tur, ayrilis, baslama, gun, yil')
        .neq('yil', 2025)
        .neq('durum', 'İptal Edildi')
        .or(IZY_IZIN_TURLERI_OR)
        .in('sicil_no', Array.from(zabitaSiciller))
        .order('id')
        .range(from, to),
    )
    izyRaw = (data ?? []) as RawIzin[]
  }

  const ivySiraNos = new Set(
    ivyRaw.map(i => i.sira_no).filter((sn): sn is string => !!sn),
  )

  const rawBySiraNo = new Map<string, RawIzin>()
  for (const raw of [...rmyRaw, ...ivyRaw, ...izyRaw]) {
    if (raw.sira_no && raw.ayrilis && raw.baslama) {
      rawBySiraNo.set(raw.sira_no, raw)
    }
  }

  const tumSiciller = new Set<string>()
  rawBySiraNo.forEach(i => { if (i.sicil_no) tumSiciller.add(i.sicil_no) })
  const adMap: Record<string, string> = {}
  if (tumSiciller.size > 0) {
    const { data: calisanlar } = await supabase
      .from('calisan')
      .select('sicil_no, ad_soyad')
      .in('sicil_no', Array.from(tumSiciller))
    ;(calisanlar ?? []).forEach(c => { if (c.sicil_no) adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no })
  }

  const tumIzinler: SosyalHakIzin[] = []
  for (const [sira_no, raw] of rawBySiraNo) {
    const sicil = (raw.sicil_no ?? '').trim()
    const tur = raw.tur ?? ''
    const tips = sosyalHakTipsForIzin(
      sicil,
      tur,
      memurSiciller,
      vekilSiciller,
      zabitaSiciller,
      ivySiraNos,
      sira_no,
    )
    if (tips.length === 0) continue

    tumIzinler.push({
      sira_no,
      sicil_no: sicil,
      ad_soyad: adMap[sicil] ?? sicil,
      tur,
      tips,
      ayrilis: raw.ayrilis!,
      baslama: raw.baslama!,
      gun: raw.gun ?? 0,
    })
  }

  const aday:      SosyalHakIzin[] = []
  const islenecek: SosyalHakIzin[] = []

  for (const iz of tumIzinler) {
    const secilenTips = buDonemSecili.get(iz.sira_no)
    if (secilenTips && secilenTips.length > 0) {
      islenecek.push({ ...iz, tips: secilenTips })
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
  secimler: { sira_no: string; tips: SosyalHakTip[] }[]
): Promise<{ hata?: string }> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  await db.from('sosyal_hak_secim').delete().eq('donem_id', donem_id)

  const rows: { donem_id: number; izin_sira_no: string; tip: SosyalHakTip; dahil: boolean }[] = []
  for (const { sira_no, tips } of secimler) {
    for (const tip of tips) {
      rows.push({ donem_id, izin_sira_no: sira_no, tip, dahil: true })
    }
  }

  if (rows.length > 0) {
    const { error } = await db.from('sosyal_hak_secim').insert(rows)
    if (error) return { hata: (error as { message: string }).message }
  }

  revalidatePath(`/kesintiler/sosyal-hak/${donem_id}`)
  revalidatePath('/kesintiler/sosyal-hak')
  return {}
}
