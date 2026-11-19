import type { SupabaseClient } from '@supabase/supabase-js'
import { ppNorm } from '@/lib/pp-erisim'
import { ppFaaliyetKodu, ppGostergeKodu, ppPerformansYol } from '@/lib/pp-iliski'

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
  /** İdare raporunda tek hedef tablosu anahtarı: `{altProgramId}_{altHedefId}` */
  tabloKey?: string
  altProgramId?: number
  altHedefId?: number
  hedefKod?: string
  hedefAd?: string
  programAdi: string
  altProgramAdi: string
  gerekce: string
  hedef: string
  veriKaynagi: string
  gostergeler: PpPerformansGosterge[]
  faaliyetler: PpPerformansFaaliyet[]
}

export function ppIdareTabloKey(altProgramId: number, altHedefId: number): string {
  return `${altProgramId}_${altHedefId}`
}

export function ppIdareTabloKeyCoz(key: string): { altProgramId: number; altHedefId: number } | null {
  const [a, b] = key.split('_')
  const altProgramId = Number(a)
  const altHedefId = Number(b)
  if (!Number.isFinite(altProgramId) || !Number.isFinite(altHedefId)) return null
  return { altProgramId, altHedefId }
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

/** alt_hedef: SP alt hedefin müdürlüğü · secilen: PP hedef bağındaki secilen_mudurluk */
export type PpRaporMudurlukKaynak = 'alt_hedef' | 'secilen'

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
  opts?: { mudurlukKaynak?: PpRaporMudurlukKaynak },
): Promise<PpPerformansRaporYil> {
  const mudurlukKaynak: PpRaporMudurlukKaynak = opts?.mudurlukKaynak ?? 'alt_hedef'
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
  type Bag = { id: number; alt_program_id: number; alt_hedef_id: number; secilen_mudurluk: string | null }
  const { data: bagRaw } = altIds.length
    ? await sb.from('performans_programi_alt_program_hedef').select('id, alt_program_id, alt_hedef_id, secilen_mudurluk').in('alt_program_id', altIds)
    : { data: [] }
  const baglar = (bagRaw ?? []) as Bag[]
  const hedefIdSet = [...new Set(baglar.map(b => b.alt_hedef_id))]
  /** İdare: her performans hedefi ayrı tablo; PF faaliyet/gösterge bag üzerinden. */
  const hedefBasinaBlok = mudurlukKaynak === 'secilen'
  const bagIds = baglar.map(b => b.id)

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

  type PfFaaliyet = { id: number; bag_id: number; sira_no: number | null; faaliyet_adi: string }
  type PfGosterge = {
    faaliyet_id: number
    sira_no: number | null
    gosterge_adi: string
    birim: string
    aciklama: string | null
    hesaplama_yontemi: string | null
    t2_gerceklesme: number | null
    t1_planlanan: number | null
    t1_yil_sonu: number | null
    t_hedef: number | null
    t1_tahmin: number | null
    t2_tahmin: number | null
  }
  type PfOdenek = {
    pf_faaliyet_id: number
    t1_butce: number | null
    t1_haziran: number | null
    t1_yil_sonu: number | null
    t_butce: number | null
    t1_tahmin: number | null
    t2_tahmin: number | null
  }

  let planFaaliyet: PlanFaaliyet[] = []
  let ozelFaaliyet: { id: number; alt_program_id: number; alt_hedef_id: number; sira_no: number | null; faaliyet_adi: string }[] = []
  let gostergeler: Gosterge[] = []
  let veriListe: Veri[] = []
  let butceListe: { faaliyet_id: number; mudurluk: string; tutar?: number | null; cari_yil_butce?: number | null; cari_yil_haziran_sonu?: number | null; cari_yil_yil_sonu_tahmin?: number | null; sonraki_yil_butce_2?: number | null; sonraki_yil_butce_3?: number | null }[] = []
  let ozelButceListe: { ozel_faaliyet_id: number; mudurluk: string; tutar?: number | null }[] = []
  let pfFaaliyetler: PfFaaliyet[] = []
  let pfGostergeler: PfGosterge[] = []
  let pfOdenekler: PfOdenek[] = []

  if (hedefBasinaBlok) {
    const { data: pfRaw } = bagIds.length
      ? await sb.from('performans_programi_pf_faaliyet').select('id, bag_id, sira_no, faaliyet_adi').in('bag_id', bagIds).order('sira_no')
      : { data: [] }
    pfFaaliyetler = (pfRaw ?? []) as PfFaaliyet[]
    const pfIds = pfFaaliyetler.map(f => f.id)
    const [{ data: pfGRaw }, { data: pfORaw }] = await Promise.all([
      pfIds.length
        ? sb.from('performans_programi_pf_gosterge').select('faaliyet_id, sira_no, gosterge_adi, birim, aciklama, hesaplama_yontemi, t2_gerceklesme, t1_planlanan, t1_yil_sonu, t_hedef, t1_tahmin, t2_tahmin').in('faaliyet_id', pfIds).order('sira_no')
        : Promise.resolve({ data: [] }),
      pfIds.length
        ? sb.from('performans_programi_pf_odenek').select('pf_faaliyet_id, t1_butce, t1_haziran, t1_yil_sonu, t_butce, t1_tahmin, t2_tahmin').in('pf_faaliyet_id', pfIds)
        : Promise.resolve({ data: [] }),
    ])
    pfGostergeler = (pfGRaw ?? []) as PfGosterge[]
    pfOdenekler = (pfORaw ?? []) as PfOdenek[]
  } else {
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
    planFaaliyet = (faaliyetRaw ?? []) as PlanFaaliyet[]
    ozelFaaliyet = (ozelRaw ?? []) as { id: number; alt_program_id: number; alt_hedef_id: number; sira_no: number | null; faaliyet_adi: string }[]
    gostergeler = (gostergeRaw ?? []) as Gosterge[]
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
    veriListe = (veriRaw ?? []) as Veri[]
    butceListe = (butceRaw ?? []) as typeof butceListe
    ozelButceListe = (ozelButceRaw ?? []) as typeof ozelButceListe
  }

  const amacById = new Map(amaclar.map(a => [a.id, a]))
  const hedefById = new Map(hedefler.map(h => [h.id, h]))
  const donemBas = ilk

  function hedefKodu(h: AltHedef): string {
    const hedef = hedefById.get(h.hedef_id)
    const amac = hedef ? amacById.get(hedef.amac_id) : undefined
    const yol = ppPerformansYol(amac?.kodu ?? '', hedef?.kodu ?? '', h.kodu ?? '')
    if (yol) return yol
    return [sayiParcasi(amac?.kodu, amac?.sira_no), sayiParcasi(hedef?.kodu, hedef?.sira_no), sayiParcasi(h.kodu, h.sira_no)]
      .filter(Boolean)
      .join('.')
  }
  function planYil(g: Gosterge, hedefYil: number): PpRaporSayi {
    const i = hedefYil - donemBas
    if (i < 0 || i > 4) return null
    return sayi([g.yil_1, g.yil_2, g.yil_3, g.yil_4, g.yil_5][i])
  }

  function bagMudurluk(b: Bag): string {
    if (mudurlukKaynak === 'secilen') return String(b.secilen_mudurluk ?? '').trim()
    const h = altHedefById.get(b.alt_hedef_id)
    return String(h?.mudurluk ?? '').trim()
  }

  function blokOlusturIdare(
    alt: { id: number; program_id: number; alt_program_adi: string; gerekce: string | null },
    h: AltHedef,
    norm: string,
    ad: string,
  ): PpPerformansBlok {
    const program = programlar.find(p => p.id === alt.program_id)
    const phKod = hedefKodu(h)
    const ilgiliBagIds = new Set(
      baglar
        .filter(b => b.alt_program_id === alt.id && b.alt_hedef_id === h.id && ppNorm(bagMudurluk(b)) === norm)
        .map(b => b.id),
    )
    const pfListe = pfFaaliyetler
      .filter(f => ilgiliBagIds.has(f.bag_id))
      .sort((a, b) => (a.sira_no ?? 0) - (b.sira_no ?? 0) || a.faaliyet_adi.localeCompare(b.faaliyet_adi, 'tr'))

    const faaliyetler: PpPerformansFaaliyet[] = pfListe.map(f => {
      const kod = ppFaaliyetKodu(phKod, Number(f.sira_no ?? 0) || 0)
      const satirlar = pfOdenekler.filter(o => o.pf_faaliyet_id === f.id)
      const topla = (alan: keyof PfOdenek) => {
        const dolu = satirlar.map(r => sayi(r[alan])).filter((n): n is number => n != null)
        return dolu.length ? dolu.reduce((x, y) => x + y, 0) : null
      }
      return {
        kod,
        ad: f.faaliyet_adi,
        tutarlar: [
          topla('t1_butce'),
          topla('t1_haziran'),
          topla('t1_yil_sonu'),
          topla('t_butce'),
          topla('t1_tahmin'),
          topla('t2_tahmin'),
        ],
      }
    })

    const gostergeSatir: PpPerformansGosterge[] = []
    for (const f of pfListe) {
      const fKod = ppFaaliyetKodu(phKod, Number(f.sira_no ?? 0) || 0)
      const gs = pfGostergeler
        .filter(g => g.faaliyet_id === f.id)
        .sort((a, b) => (a.sira_no ?? 0) - (b.sira_no ?? 0) || a.gosterge_adi.localeCompare(b.gosterge_adi, 'tr'))
      gs.forEach((g, i) => {
        const sira = Number(g.sira_no ?? 0) || i + 1
        gostergeSatir.push({
          kod: ppGostergeKodu(fKod, sira),
          ad: g.gosterge_adi,
          birim: BIRIM[g.birim] ?? g.birim,
          degerler: [
            sayi(g.t2_gerceklesme),
            sayi(g.t1_planlanan),
            sayi(g.t1_yil_sonu),
            sayi(g.t_hedef),
            sayi(g.t1_tahmin),
            sayi(g.t2_tahmin),
          ],
          aciklama: String(g.aciklama ?? '').trim(),
          hesaplama: String(g.hesaplama_yontemi ?? '').trim(),
          sorumlu: ad,
        })
      })
    }

    return {
      tabloKey: ppIdareTabloKey(alt.id, h.id),
      altProgramId: alt.id,
      altHedefId: h.id,
      hedefKod: phKod,
      hedefAd: h.alt_hedef_adi,
      programAdi: program?.program_adi ?? '',
      altProgramAdi: alt.alt_program_adi,
      gerekce: String(alt.gerekce ?? '').trim(),
      hedef: `PH ${phKod} ${h.alt_hedef_adi}`.trim(),
      veriKaynagi: ad,
      gostergeler: gostergeSatir,
      faaliyetler,
    }
  }

  function blokOlustur(
    alt: { id: number; program_id: number; alt_program_adi: string; gerekce: string | null },
    hedefSirali: AltHedef[],
    norm: string,
    ad: string,
  ): PpPerformansBlok {
    const hedefIdleri = new Set(hedefSirali.map(h => h.id))
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
        const kod = [sahip ? hedefKodu(sahip) : '', String(f.sira_no ?? '')].filter(Boolean).join('.')
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
    const tek = hedefSirali.length === 1 ? hedefSirali[0] : null
    const kodlar = hedefSirali.map(x => hedefKodu(x))
    return {
      tabloKey: tek ? ppIdareTabloKey(alt.id, tek.id) : undefined,
      altProgramId: alt.id,
      altHedefId: tek?.id,
      hedefKod: tek ? kodlar[0] : undefined,
      hedefAd: tek?.alt_hedef_adi,
      programAdi: program?.program_adi ?? '',
      altProgramAdi: alt.alt_program_adi,
      gerekce: String(alt.gerekce ?? '').trim(),
      hedef: hedefSirali.map((x, i) => `PH ${kodlar[i]} ${x.alt_hedef_adi}`.trim()).join('\n'),
      veriKaynagi: ad,
      gostergeler: gostergeSatir,
      faaliyetler,
    }
  }

  const mudurlukAd = new Map<string, string>()
  for (const b of baglar) {
    if (!altHedefById.has(b.alt_hedef_id)) continue
    const ad = bagMudurluk(b)
    const n = ppNorm(ad)
    if (ad && !mudurlukAd.has(n)) mudurlukAd.set(n, ad)
  }

  const sekmeler: PpPerformansSekme[] = [...mudurlukAd.entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'tr'))
    .map(([norm, ad]) => {
      const bloklar: PpPerformansBlok[] = []
      for (const alt of altlar) {
        const bagli = baglar.filter(
          b => b.alt_program_id === alt.id && altHedefById.has(b.alt_hedef_id) && ppNorm(bagMudurluk(b)) === norm,
        )
        if (!bagli.length) continue
        const hedefSirali: AltHedef[] = []
        const gorulen = new Set<number>()
        for (const b of bagli) {
          if (gorulen.has(b.alt_hedef_id)) continue
          gorulen.add(b.alt_hedef_id)
          hedefSirali.push(altHedefById.get(b.alt_hedef_id)!)
        }
        if (hedefBasinaBlok) {
          for (const h of hedefSirali) {
            bloklar.push(blokOlusturIdare(alt, h, norm, ad))
          }
        } else {
          bloklar.push(blokOlustur(alt, hedefSirali, norm, ad))
        }
      }
      bloklar.sort((a, b) => (a.hedefKod ?? a.hedef).localeCompare(b.hedefKod ?? b.hedef, 'tr'))
      return { mudurluk: ad, bloklar }
    })
    .filter(s => s.bloklar.length)

  return { yil, yillar, sekmeler }
}
