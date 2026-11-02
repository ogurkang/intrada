import type { SupabaseClient } from '@supabase/supabase-js'
import { ppNorm } from '@/lib/pp-erisim'

export type PpRaporSayi = number | null

export type PpPerformansGosterge = {
  kod: string
  ad: string
  birim: string
  degerler: PpRaporSayi[]
  aciklama: string
  hesaplama: string
  sorumlu: string
}

export type PpPerformansFaaliyet = {
  kod: string
  ad: string
  tutarlar: PpRaporSayi[]
}

export type PpPerformansBlok = {
  programAdi: string
  altProgramAdi: string
  gerekce: string
  hedef: string
  veriKaynagi: string
  gostergeler: PpPerformansGosterge[]
  faaliyetler: PpPerformansFaaliyet[]
}

export type PpPerformansSekme = {
  mudurluk: string
  bloklar: PpPerformansBlok[]
}

export type PpPerformansRaporYil = {
  yil: number
  yillar: number[]
  sekmeler: PpPerformansSekme[]
}

const BIRIM: Record<string, string> = {
  Yuzde: 'Yüzde (%)',
  Adet: 'Adet',
  Kisi: 'Kişi',
  Gun: 'Gün',
  Hektar: 'Hektar',
  Ton: 'Ton',
  Metre: 'Metre',
  Metrekare: 'Metrekare',
  Saat: 'Saat',
}

function sayiParcasi(kodu: string | null | undefined, sira: number | null | undefined): string {
  const son = String(kodu ?? '').split('.').map(s => s.trim()).filter(Boolean).pop() ?? ''
  const sayi = son.replace(/sa|sh/gi, '').trim()
  if (sayi) return sayi
  return sira != null && Number.isFinite(Number(sira)) ? String(sira) : ''
}

function sayi(v: unknown): PpRaporSayi {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function ppRaporPara(n: PpRaporSayi): string {
  if (n == null) return ''
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function ppRaporGosterge(n: PpRaporSayi): string {
  if (n == null) return ''
  return n.toLocaleString('tr-TR', { maximumFractionDigits: 2 })
}

export function ppGostergeBaslik(yil: number): string[] {
  return [
    `${yil - 2} Gerçekleşme`,
    `${yil - 1} Planlanan`,
    `${yil - 1} Yıl Sonu Gerçekleşme Tahmini`,
    `${yil} Hedef`,
    `${yil + 1} Tahmin`,
    `${yil + 2} Tahmin`,
  ]
}

export function ppMaliyetBaslik(yil: number): string[] {
  return [
    `${yil - 1} Bütçe`,
    `${yil - 1} Haziran Sonu Harcama`,
    `${yil - 1} Yıl Sonu Har.Tah.`,
    `${yil} Bütçe`,
    `${yil + 1} Tahmin`,
    `${yil + 2} Tahmin`,
  ]
}

type Amac = { id: number; kodu: string; sira_no: number | null }
type Hedef = { id: number; amac_id: number; kodu: string; sira_no: number | null }
type AltHedef = { id: number; hedef_id: number; kodu: string; sira_no: number | null; alt_hedef_adi: string; mudurluk: string }
type PlanFaaliyet = { id: number; alt_hedef_id: number; sira_no: number | null; faaliyet_adi: string }
type Gosterge = {
  id: number
  alt_hedef_id: number
  faaliyet_id: number | null
  gosterge_adi: string
  birim: string
  yil_1: number | null
  yil_2: number | null
  yil_3: number | null
  yil_4: number | null
  yil_5: number | null
}
type Veri = {
  gosterge_id: number
  yil: number
  mudurluk: string
  planlanan_cari_yil?: number | null
  gerceklesme_tahmini_cari_yil?: number | null
  onceki_yil_gerceklesme?: number | null
  tahmin_sonraki_yil_1?: number | null
  tahmin_sonraki_yil_2?: number | null
  gosterge_aciklama?: string | null
  hesaplama_yontemi?: string | null
}

export async function ppPerformansRaporYili(
  supabase: SupabaseClient,
  istenenYil: number | null,
): Promise<PpPerformansRaporYil> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data: donemRaw } = await sb
    .from('stratejik_plan_donem')
    .select('id, baslangic_tarihi, bitis_tarihi, aktif')
    .eq('aktif', true)
    .order('id', { ascending: false })
    .limit(1)
  const donem = (donemRaw ?? [])[0] as { id: number; baslangic_tarihi: string; bitis_tarihi: string } | undefined
  const ilk = donem ? Number(String(donem.baslangic_tarihi).slice(0, 4)) : NaN
  const son = donem ? Number(String(donem.bitis_tarihi).slice(0, 4)) : NaN
  const yillar: number[] = []
  if (Number.isFinite(ilk) && Number.isFinite(son) && son >= ilk) {
    for (let y = ilk; y <= son; y += 1) yillar.push(y)
  }
  const bugun = new Date().getFullYear()
  const yil = yillar.includes(Number(istenenYil))
    ? Number(istenenYil)
    : yillar.includes(bugun)
      ? bugun
      : yillar[yillar.length - 1] ?? bugun
  if (!donem || !yillar.length) return { yil, yillar, sekmeler: [] }

  const { data: programRaw } = await sb.from('performans_programi_program').select('id, program_adi').eq('yil', yil)
  const programlar = (programRaw ?? []) as { id: number; program_adi: string }[]
  const programIds = programlar.map(p => p.id)
  const { data: altRaw } = programIds.length
    ? await sb.from('performans_programi_alt_program').select('id, program_id, alt_program_adi, gerekce').in('program_id', programIds).order('sira_no', { ascending: true, nullsFirst: false })
    : { data: [] }
  const altlar = (altRaw ?? []) as { id: number; program_id: number; alt_program_adi: string; gerekce: string | null }[]
  const altIds = altlar.map(a => a.id)
  const { data: bagRaw } = altIds.length
    ? await sb.from('performans_programi_alt_program_hedef').select('alt_program_id, alt_hedef_id').in('alt_program_id', altIds)
    : { data: [] }
  const baglar = (bagRaw ?? []) as { alt_program_id: number; alt_hedef_id: number }[]
  const hedefIdSet = [...new Set(baglar.map(b => b.alt_hedef_id))]

  const { data: amacRaw } = await sb.from('stratejik_plan_amac').select('id, kodu, sira_no').eq('donem_id', donem.id)
  const amaclar = (amacRaw ?? []) as Amac[]
  const amacIds = amaclar.map(a => a.id)
  const { data: hedefRaw } = amacIds.length
    ? await sb.from('stratejik_plan_hedef').select('id, amac_id, kodu, sira_no').in('amac_id', amacIds)
    : { data: [] }
  const hedefler = (hedefRaw ?? []) as Hedef[]
  const spHedefIds = hedefler.map(h => h.id)
  const { data: altHedefRaw } = spHedefIds.length && hedefIdSet.length
    ? await sb.from('stratejik_plan_alt_hedef').select('id, hedef_id, kodu, sira_no, alt_hedef_adi, mudurluk').in('id', hedefIdSet).in('hedef_id', spHedefIds).eq('aktif', true)
    : { data: [] }
  const altHedefler = (altHedefRaw ?? []) as AltHedef[]
  const altHedefById = new Map(altHedefler.map(h => [h.id, h]))
  const gecerliHedefIds = altHedefler.map(h => h.id)

  const [{ data: faaliyetRaw }, { data: ozelRaw }, { data: gostergeRaw }] = await Promise.all([
    gecerliHedefIds.length
      ? sb.from('stratejik_plan_faaliyet').select('id, alt_hedef_id, sira_no, faaliyet_adi').in('alt_hedef_id', gecerliHedefIds).eq('aktif', true).order('sira_no')
      : Promise.resolve({ data: [] }),
    altIds.length
      ? sb.from('performans_programi_ozel_faaliyet').select('id, alt_program_id, alt_hedef_id, sira_no, faaliyet_adi').eq('yil', yil).in('alt_program_id', altIds)
      : Promise.resolve({ data: [] }),
    gecerliHedefIds.length
      ? sb.from('stratejik_plan_gosterge').select('id, alt_hedef_id, faaliyet_id, gosterge_adi, birim, yil_1, yil_2, yil_3, yil_4, yil_5').in('alt_hedef_id', gecerliHedefIds).eq('aktif', true).order('sira_no')
      : Promise.resolve({ data: [] }),
  ])
  const planFaaliyet = (faaliyetRaw ?? []) as PlanFaaliyet[]
  const ozelFaaliyet = (ozelRaw ?? []) as { id: number; alt_program_id: number; alt_hedef_id: number; sira_no: number | null; faaliyet_adi: string }[]
  const gostergeler = (gostergeRaw ?? []) as Gosterge[]
  const gostergeIds = gostergeler.map(g => g.id)
  const planIds = planFaaliyet.map(f => f.id)
  const ozelIds = ozelFaaliyet.map(f => f.id)
  const [{ data: veriRaw }, { data: butceRaw }, { data: ozelButceRaw }] = await Promise.all([
    gostergeIds.length
      ? sb.from('performans_programi_veri_giris').select('gosterge_id, yil, mudurluk, planlanan_cari_yil, gerceklesme_tahmini_cari_yil, onceki_yil_gerceklesme, tahmin_sonraki_yil_1, tahmin_sonraki_yil_2, gosterge_aciklama, hesaplama_yontemi').in('gosterge_id', gostergeIds).in('yil', [yil - 1, yil])
      : Promise.resolve({ data: [] }),
    planIds.length
      ? sb.from('performans_programi_faaliyet_butce').select('faaliyet_id, mudurluk, tutar, cari_yil_butce, cari_yil_haziran_sonu, cari_yil_yil_sonu_tahmin, sonraki_yil_butce_2, sonraki_yil_butce_3').eq('yil', yil).in('faaliyet_id', planIds)
      : Promise.resolve({ data: [] }),
    ozelIds.length
      ? sb.from('performans_programi_ozel_faaliyet_butce').select('ozel_faaliyet_id, mudurluk, tutar').eq('yil', yil).in('ozel_faaliyet_id', ozelIds)
      : Promise.resolve({ data: [] }),
  ])

  const amacById = new Map(amaclar.map(a => [a.id, a]))
  const hedefById = new Map(hedefler.map(h => [h.id, h]))
  const donemBas = ilk
  const veriListe = (veriRaw ?? []) as Veri[]
  const butceListe = (butceRaw ?? []) as { faaliyet_id: number; mudurluk: string; tutar?: number | null; cari_yil_butce?: number | null; cari_yil_haziran_sonu?: number | null; cari_yil_yil_sonu_tahmin?: number | null; sonraki_yil_butce_2?: number | null; sonraki_yil_butce_3?: number | null }[]
  const ozelButceListe = (ozelButceRaw ?? []) as { ozel_faaliyet_id: number; mudurluk: string; tutar?: number | null }[]

  function kodKok(h: AltHedef): string[] {
    const hedef = hedefById.get(h.hedef_id)
    const amac = hedef ? amacById.get(hedef.amac_id) : undefined
    return [sayiParcasi(amac?.kodu, amac?.sira_no), sayiParcasi(hedef?.kodu, hedef?.sira_no), sayiParcasi(h.kodu, h.sira_no)]
  }
  function planYil(g: Gosterge, hedefYil: number): PpRaporSayi {
    const i = hedefYil - donemBas
    if (i < 0 || i > 4) return null
    return sayi([g.yil_1, g.yil_2, g.yil_3, g.yil_4, g.yil_5][i])
  }

  const mudurlukAd = new Map<string, string>()
  for (const h of altHedefler) {
    const ad = h.mudurluk.trim()
    const n = ppNorm(ad)
    if (ad && !mudurlukAd.has(n)) mudurlukAd.set(n, ad)
  }

  const sekmeler: PpPerformansSekme[] = [...mudurlukAd.entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'tr'))
    .map(([norm, ad]) => {
      const bloklar: PpPerformansBlok[] = []
      for (const alt of altlar) {
        const bagli = baglar.filter(b => b.alt_program_id === alt.id && altHedefById.has(b.alt_hedef_id))
        const hedeflerBlok = bagli.map(b => altHedefById.get(b.alt_hedef_id)!).filter(h => ppNorm(h.mudurluk) === norm)
        if (!hedeflerBlok.length) continue
        const hedefIdleri = new Set(hedeflerBlok.map(h => h.id))
        const program = programlar.find(p => p.id === alt.program_id)
        const plan = planFaaliyet.filter(f => hedefIdleri.has(f.alt_hedef_id))
        const ozel = ozelFaaliyet.filter(f => f.alt_program_id === alt.id && hedefIdleri.has(f.alt_hedef_id))
        const kodByPlan = new Map<number, string>()
        const faaliyetler: PpPerformansFaaliyet[] = [
          ...plan.map(f => ({ ...f, ozel: false as const })),
          ...ozel.map(f => ({ ...f, ozel: true as const })),
        ]
          .sort((a, b) => (a.sira_no ?? 0) - (b.sira_no ?? 0) || a.faaliyet_adi.localeCompare(b.faaliyet_adi, 'tr'))
          .map(f => {
            const sahip = altHedefById.get(f.alt_hedef_id)
            const kod = [...(sahip ? kodKok(sahip) : []), String(f.sira_no ?? '')].filter(Boolean).join('.')
            if (!f.ozel) kodByPlan.set(f.id, kod)
            const satirlar = f.ozel
              ? ozelButceListe.filter(r => r.ozel_faaliyet_id === f.id && ppNorm(r.mudurluk) === norm)
              : butceListe.filter(r => r.faaliyet_id === f.id && ppNorm(r.mudurluk) === norm)
            const topla = (alan: 'cari_yil_butce' | 'cari_yil_haziran_sonu' | 'cari_yil_yil_sonu_tahmin' | 'tutar' | 'sonraki_yil_butce_2' | 'sonraki_yil_butce_3') => {
              const dolu = satirlar.map(r => sayi((r as Record<string, unknown>)[alan])).filter((n): n is number => n != null)
              return dolu.length ? dolu.reduce((x, y) => x + y, 0) : null
            }
            return {
              kod,
              ad: f.faaliyet_adi,
              tutarlar: f.ozel
                ? [null, null, null, topla('tutar'), null, null]
                : [topla('cari_yil_butce'), topla('cari_yil_haziran_sonu'), topla('cari_yil_yil_sonu_tahmin'), topla('tutar'), topla('sonraki_yil_butce_2'), topla('sonraki_yil_butce_3')],
            }
          })
        const gostergeSatir: PpPerformansGosterge[] = gostergeler
          .filter(g => g.faaliyet_id != null && plan.some(f => f.id === g.faaliyet_id))
          .map(g => {
            const onceki = veriListe.find(v => v.gosterge_id === g.id && v.yil === yil - 1 && ppNorm(v.mudurluk) === norm)
            const cari = veriListe.find(v => v.gosterge_id === g.id && v.yil === yil && ppNorm(v.mudurluk) === norm)
            return {
              kod: kodByPlan.get(g.faaliyet_id!) ?? '',
              ad: g.gosterge_adi,
              birim: BIRIM[g.birim] ?? g.birim,
              degerler: [
                sayi(onceki?.onceki_yil_gerceklesme),
                sayi(onceki?.planlanan_cari_yil) ?? planYil(g, yil - 1),
                sayi(onceki?.gerceklesme_tahmini_cari_yil),
                sayi(cari?.planlanan_cari_yil) ?? planYil(g, yil),
                sayi(cari?.tahmin_sonraki_yil_1) ?? planYil(g, yil + 1),
                sayi(cari?.tahmin_sonraki_yil_2) ?? planYil(g, yil + 2),
              ],
              aciklama: String(cari?.gosterge_aciklama ?? onceki?.gosterge_aciklama ?? '').trim(),
              hesaplama: String(cari?.hesaplama_yontemi ?? onceki?.hesaplama_yontemi ?? '').trim(),
              sorumlu: ad,
            }
          })
        bloklar.push({
          programAdi: program?.program_adi ?? '',
          altProgramAdi: alt.alt_program_adi,
          gerekce: String(alt.gerekce ?? '').trim(),
          hedef: hedeflerBlok.map(h => `PH ${kodKok(h).filter(Boolean).join('.')} ${h.alt_hedef_adi}`.trim()).join('\n'),
          veriKaynagi: ad,
          gostergeler: gostergeSatir,
          faaliyetler,
        })
      }
      return { mudurluk: ad, bloklar }
    })
    .filter(s => s.bloklar.length)

  return { yil, yillar, sekmeler }
}
