import type { SupabaseClient } from '@supabase/supabase-js'
import { ppNorm } from '@/lib/pp-erisim'
import {
  ppFaaliyetKodu,
  ppGostergeKodu,
  ppKodSirala,
  ppKodTemiz,
  ppPerformansYol,
} from '@/lib/pp-iliski'
import { ppRaporVarsayilanYil, type PpRaporSayi } from './pp-mudurluk-rapor'
import { ppPfOdenekSatirlariYukle } from '@/lib/pp-pf-odenek'

export type PpMudSatirTur =
  | 'amac_baslik'
  | 'amac_metin'
  | 'kolon_baslik'
  | 'program'
  | 'alt_program'
  | 'faaliyet'
  | 'stratejik_hedef'
  | 'mudurluk'
  | 'performans_hedefi'
  | 'performans_faaliyeti'
  | 'gosterge'
  | 'butce'

/** Kodu sütunu: B=2 … H=8 (şablondaki hiyerarşi basamakları). */
export type PpMudKodCol = 2 | 3 | 4 | 5 | 6 | 7 | 8

export type PpMudSatir = {
  tur: PpMudSatirTur
  etiket: string
  kodCol?: PpMudKodCol
  kod?: string
  aciklama: string
  tutar?: PpRaporSayi
}

export type PpMudurlukProgramSekme = {
  mudurluk: string
  satirlar: PpMudSatir[]
}

export type PpMudurlukProgramRapor = {
  yil: number
  yillar: number[]
  sekmeler: PpMudurlukProgramSekme[]
}

const BIRIM: Record<string, string> = {
  Yuzde: '%',
  Adet: 'adet',
  Kisi: 'kişi',
  Gun: 'gün',
  Hektar: 'hektar',
  Ton: 'ton',
  Metre: 'metre',
  Metrekare: 'm²',
  Saat: 'saat',
}

function sayi(v: unknown): PpRaporSayi {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function tutarTopla(...degerler: PpRaporSayi[]): PpRaporSayi {
  const dolu = degerler.filter((n): n is number => n != null)
  return dolu.length ? dolu.reduce((a, b) => a + b, 0) : null
}

function sayiParcasi(kodu: string | null | undefined, sira: number | null | undefined): string {
  const son = String(kodu ?? '').split('.').map(s => s.trim()).filter(Boolean).pop() ?? ''
  const sayiK = son.replace(/sa|sh/gi, '').trim()
  if (sayiK) return sayiK
  return sira != null && Number.isFinite(Number(sira)) ? String(sira) : ''
}

function amacEtiket(kodu: string | null | undefined, sira: number | null | undefined): string {
  const n = sayiParcasi(kodu, sira) || '—'
  return `Stratejik Amaç ${n}`
}

type Dal = {
  amacId: number
  amacSira: number | null
  amacKodu: string
  amacAdi: string
  programId: number
  programKodu: string
  programAdi: string
  altId: number
  altKodu: string
  altAdi: string
  sinifFaaliyetId: number
  sinifFaaliyetKodu: string
  sinifFaaliyetAdi: string
  hedefId: number
  hedefKodu: string
  hedefAdi: string
  phId: number
  phKodu: string
  phAdi: string
  mudurluk: string
  pfListe: {
    id: number
    sira: number
    ad: string
    kod: string
    tutar: PpRaporSayi
    gostergeler: { kod: string; ad: string; birim: string; hedef: PpRaporSayi }[]
  }[]
}

/**
 * Müdürlüklerin Performans Programı — t6 şablon hiyerarşisi.
 * Stratejik Amaç → Program → Alt Program → Faaliyet → Müdürlük (bir kez)
 * → Stratejik Hedef… → Performans Hedefi → Performans Faaliyeti → Gösterge (yıl hedefi) / BÜTÇE
 */
export async function ppMudurlukProgramRaporYili(
  supabase: SupabaseClient,
  istenenYil: number | null,
): Promise<PpMudurlukProgramRapor> {
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
  const yil = ppRaporVarsayilanYil(yillar, istenenYil)
  if (!donem || !yillar.length) return { yil, yillar, sekmeler: [] }

  const { data: programRaw } = await sb
    .from('performans_programi_program')
    .select('id, program_adi, kodu, sira_no')
    .eq('yil', yil)
    .order('sira_no', { ascending: true, nullsFirst: false })
  const programlar = (programRaw ?? []) as {
    id: number
    program_adi: string
    kodu: string | null
    sira_no: number | null
  }[]
  const programIds = programlar.map(p => p.id)

  const { data: altRaw } = programIds.length
    ? await sb
      .from('performans_programi_alt_program')
      .select('id, program_id, alt_program_adi, kodu, sira_no')
      .in('program_id', programIds)
      .order('sira_no', { ascending: true, nullsFirst: false })
    : { data: [] }
  const altlar = (altRaw ?? []) as {
    id: number
    program_id: number
    alt_program_adi: string
    kodu: string | null
    sira_no: number | null
  }[]
  const altIds = altlar.map(a => a.id)

  type Bag = {
    id: number
    alt_program_id: number
    alt_hedef_id: number
    faaliyet_id: number | null
    secilen_mudurluk: string | null
  }
  const { data: bagRaw } = altIds.length
    ? await sb
      .from('performans_programi_alt_program_hedef')
      .select('id, alt_program_id, alt_hedef_id, faaliyet_id, secilen_mudurluk')
      .in('alt_program_id', altIds)
    : { data: [] }
  const baglar = ((bagRaw ?? []) as Bag[]).filter(
    b => b.faaliyet_id != null && String(b.secilen_mudurluk ?? '').trim() !== '',
  )
  const bagIds = baglar.map(b => b.id)
  const sinifIds = [...new Set(baglar.map(b => Number(b.faaliyet_id)).filter(Number.isFinite))]
  const phIds = [...new Set(baglar.map(b => b.alt_hedef_id))]

  /** Sınıflandırma faaliyeti: bag.faaliyet_id → pf_faaliyet (alt_program_id dolu, bag_id boş). */
  const { data: sinifRaw } = sinifIds.length
    ? await sb
      .from('performans_programi_pf_faaliyet')
      .select('id, alt_program_id, faaliyet_adi, kodu, sira_no')
      .in('id', sinifIds)
    : { data: [] }
  const siniflar = (sinifRaw ?? []) as {
    id: number
    alt_program_id: number
    faaliyet_adi: string
    kodu: string | null
    sira_no: number | null
  }[]
  const sinifById = new Map(siniflar.map(f => [f.id, f]))

  const { data: amacRaw } = await sb
    .from('stratejik_plan_amac')
    .select('id, kodu, sira_no, amac_adi')
    .eq('donem_id', donem.id)
  const amaclar = (amacRaw ?? []) as {
    id: number
    kodu: string | null
    sira_no: number | null
    amac_adi: string | null
  }[]
  const amacById = new Map(amaclar.map(a => [a.id, a]))
  const amacIds = amaclar.map(a => a.id)

  const { data: hedefRaw } = amacIds.length
    ? await sb
      .from('stratejik_plan_hedef')
      .select('id, amac_id, kodu, sira_no, hedef_adi')
      .in('amac_id', amacIds)
    : { data: [] }
  const hedefler = (hedefRaw ?? []) as {
    id: number
    amac_id: number
    kodu: string | null
    sira_no: number | null
    hedef_adi: string | null
  }[]
  const hedefById = new Map(hedefler.map(h => [h.id, h]))
  const spHedefIds = hedefler.map(h => h.id)

  const { data: altHedefRaw } = phIds.length && spHedefIds.length
    ? await sb
      .from('stratejik_plan_alt_hedef')
      .select('id, hedef_id, kodu, sira_no, alt_hedef_adi')
      .in('id', phIds)
      .in('hedef_id', spHedefIds)
      .eq('aktif', true)
    : { data: [] }
  const altHedefler = (altHedefRaw ?? []) as {
    id: number
    hedef_id: number
    kodu: string | null
    sira_no: number | null
    alt_hedef_adi: string
  }[]
  const phById = new Map(altHedefler.map(h => [h.id, h]))

  type PfF = { id: number; bag_id: number; sira_no: number | null; faaliyet_adi: string; kurum_ici?: boolean }
  type PfG = {
    faaliyet_id: number
    sira_no: number | null
    gosterge_adi: string
    birim: string
    t_hedef: number | null
  }
  type PfO = { pf_faaliyet_id: number; t_butce: number | null }

  const pfSorgu = bagIds.length
    ? await sb
      .from('performans_programi_pf_faaliyet')
      .select('id, bag_id, sira_no, faaliyet_adi')
      .in('bag_id', bagIds)
      .order('sira_no')
    : { data: [], error: null }
  let pfFaaliyetler = (pfSorgu.data ?? []) as PfF[]
  const pfIds = pfFaaliyetler.map(f => f.id)

  const [{ data: pfGRaw }, odenekYukle] = await Promise.all([
    pfIds.length
      ? sb
        .from('performans_programi_pf_gosterge')
        .select('faaliyet_id, sira_no, gosterge_adi, birim, t_hedef')
        .in('faaliyet_id', pfIds)
        .order('sira_no')
      : Promise.resolve({ data: [] }),
    ppPfOdenekSatirlariYukle(sb as never, pfIds, 't_butce'),
  ])
  const kurumIciSet = new Set(odenekYukle.kurumIciFaaliyetIds ?? [])
  pfFaaliyetler = pfFaaliyetler.map(f => ({ ...f, kurum_ici: kurumIciSet.has(f.id) }))
  const pfGostergeler = (pfGRaw ?? []) as PfG[]
  const pfOdenekler = odenekYukle.data as PfO[]

  const programById = new Map(programlar.map(p => [p.id, p]))
  const altById = new Map(altlar.map(a => [a.id, a]))

  function hedefKodu(ph: { hedef_id: number; kodu: string | null; sira_no: number | null }): string {
    const hedef = hedefById.get(ph.hedef_id)
    const amac = hedef ? amacById.get(hedef.amac_id) : undefined
    const yol = ppPerformansYol(amac?.kodu ?? '', hedef?.kodu ?? '', ph.kodu ?? '')
    if (yol) return yol
    return [sayiParcasi(amac?.kodu, amac?.sira_no), sayiParcasi(hedef?.kodu, hedef?.sira_no), sayiParcasi(ph.kodu, ph.sira_no)]
      .filter(Boolean)
      .join('.')
  }

  function stratejikHedefKodu(hedef: { amac_id: number; kodu: string | null; sira_no: number | null }): string {
    const temiz = ppKodTemiz(String(hedef.kodu ?? ''))
    if (temiz.includes('.')) return temiz
    const amac = amacById.get(hedef.amac_id)
    const a = sayiParcasi(amac?.kodu, amac?.sira_no)
    const h = sayiParcasi(hedef.kodu, hedef.sira_no)
    return [a, h].filter(Boolean).join('.')
  }

  const dallar: Dal[] = []
  for (const bag of baglar) {
    const ph = phById.get(bag.alt_hedef_id)
    if (!ph) continue
    const hedef = hedefById.get(ph.hedef_id)
    if (!hedef) continue
    const amac = amacById.get(hedef.amac_id)
    if (!amac) continue
    const alt = altById.get(bag.alt_program_id)
    if (!alt) continue
    const program = programById.get(alt.program_id)
    if (!program) continue
    const sinif = sinifById.get(Number(bag.faaliyet_id))
    if (!sinif) continue
    const mudurluk = String(bag.secilen_mudurluk ?? '').trim()
    if (!mudurluk) continue

    const phKod = hedefKodu(ph)
    const pfListe = pfFaaliyetler
      .filter(f => f.bag_id === bag.id)
      .sort((a, b) => (a.sira_no ?? 0) - (b.sira_no ?? 0) || a.faaliyet_adi.localeCompare(b.faaliyet_adi, 'tr'))
      .map((f, i) => {
        const sira = Number(f.sira_no ?? 0) || i + 1
        const kod = ppFaaliyetKodu(phKod, sira)
        const odenek = pfOdenekler.filter(o => o.pf_faaliyet_id === f.id)
        const tutar = f.kurum_ici
          ? null
          : (() => {
            const dolu = odenek.map(o => sayi(o.t_butce)).filter((n): n is number => n != null)
            return dolu.length ? dolu.reduce((x, y) => x + y, 0) : null
          })()
        const gostergeler = pfGostergeler
          .filter(g => g.faaliyet_id === f.id)
          .sort((a, b) => (a.sira_no ?? 0) - (b.sira_no ?? 0) || a.gosterge_adi.localeCompare(b.gosterge_adi, 'tr'))
          .map((g, gi) => {
            const gs = Number(g.sira_no ?? 0) || gi + 1
            const birim = BIRIM[g.birim] ?? g.birim
            const ad = birim && !g.gosterge_adi.toLowerCase().includes(birim.toLowerCase())
              ? `${g.gosterge_adi} (${birim})`
              : g.gosterge_adi
            return { kod: ppGostergeKodu(kod, gs), ad, birim, hedef: sayi(g.t_hedef) }
          })
        return { id: f.id, sira, ad: f.faaliyet_adi, kod, tutar, gostergeler }
      })

    dallar.push({
      amacId: amac.id,
      amacSira: amac.sira_no,
      amacKodu: String(amac.kodu ?? ''),
      amacAdi: String(amac.amac_adi ?? '').trim(),
      programId: program.id,
      programKodu: String(program.kodu ?? '').trim(),
      programAdi: program.program_adi,
      altId: alt.id,
      altKodu: String(alt.kodu ?? '').trim(),
      altAdi: alt.alt_program_adi,
      sinifFaaliyetId: sinif.id,
      sinifFaaliyetKodu: String(sinif.kodu ?? '').trim(),
      sinifFaaliyetAdi: sinif.faaliyet_adi,
      hedefId: hedef.id,
      hedefKodu: stratejikHedefKodu(hedef),
      hedefAdi: String(hedef.hedef_adi ?? '').trim(),
      phId: ph.id,
      phKodu: phKod,
      phAdi: ph.alt_hedef_adi,
      mudurluk,
      pfListe,
    })
  }

  dallar.sort((a, b) =>
    (a.amacSira ?? 0) - (b.amacSira ?? 0)
    || ppKodSirala(a.amacKodu, b.amacKodu)
    || a.mudurluk.localeCompare(b.mudurluk, 'tr')
    || ppKodSirala(a.programKodu, b.programKodu)
    || ppKodSirala(a.altKodu, b.altKodu)
    || ppKodSirala(a.sinifFaaliyetKodu, b.sinifFaaliyetKodu)
    || ppKodSirala(a.hedefKodu, b.hedefKodu)
    || ppKodSirala(a.phKodu, b.phKodu),
  )

  const mudurlukAd = new Map<string, string>()
  for (const d of dallar) {
    const n = ppNorm(d.mudurluk)
    if (!mudurlukAd.has(n)) mudurlukAd.set(n, d.mudurluk)
  }

  function dalOdenek(d: Dal): PpRaporSayi {
    return tutarTopla(...d.pfListe.map(f => f.tutar))
  }

  const sekmeler: PpMudurlukProgramSekme[] = [...mudurlukAd.entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'tr'))
    .map(([norm, mudurluk]) => {
      const liste = dallar.filter(d => ppNorm(d.mudurluk) === norm)
      const satirlar: PpMudSatir[] = []
      let oncekiAmac = -1
      let oncekiPaf = ''
      let oncekiHedef = -1

      for (const d of liste) {
        if (d.amacId !== oncekiAmac) {
          oncekiAmac = d.amacId
          oncekiPaf = ''
          oncekiHedef = -1
          satirlar.push({
            tur: 'amac_baslik',
            etiket: amacEtiket(d.amacKodu, d.amacSira),
            aciklama: amacEtiket(d.amacKodu, d.amacSira),
          })
          satirlar.push({
            tur: 'amac_metin',
            etiket: d.amacAdi,
            aciklama: d.amacAdi,
          })
          satirlar.push({
            tur: 'kolon_baslik',
            etiket: 'Türü',
            aciklama: 'Açıklama',
          })
        }

        const pafKey = `${d.programId}|${d.altId}|${d.sinifFaaliyetId}`
        if (pafKey !== oncekiPaf) {
          oncekiPaf = pafKey
          oncekiHedef = -1
          const pafDallar = liste.filter(
            x => x.amacId === d.amacId
              && x.programId === d.programId
              && x.altId === d.altId
              && x.sinifFaaliyetId === d.sinifFaaliyetId,
          )
          const pafToplam = tutarTopla(...pafDallar.map(dalOdenek))
          satirlar.push({
            tur: 'program',
            etiket: 'Program',
            kodCol: 2,
            kod: d.programKodu,
            aciklama: d.programAdi,
            tutar: pafToplam,
          })
          satirlar.push({
            tur: 'alt_program',
            etiket: 'Alt Program',
            kodCol: 3,
            kod: d.altKodu,
            aciklama: d.altAdi,
            tutar: pafToplam,
          })
          satirlar.push({
            tur: 'faaliyet',
            etiket: 'Faaliyet',
            kodCol: 4,
            kod: d.sinifFaaliyetKodu,
            aciklama: d.sinifFaaliyetAdi,
            tutar: pafToplam,
          })
          satirlar.push({
            tur: 'mudurluk',
            etiket: 'Müdürlük',
            aciklama: d.mudurluk,
            tutar: pafToplam,
          })
        }

        if (d.hedefId !== oncekiHedef) {
          oncekiHedef = d.hedefId
          const hedefDallar = liste.filter(
            x => x.amacId === d.amacId
              && x.programId === d.programId
              && x.altId === d.altId
              && x.sinifFaaliyetId === d.sinifFaaliyetId
              && x.hedefId === d.hedefId,
          )
          satirlar.push({
            tur: 'stratejik_hedef',
            etiket: 'Stratejik Hedef',
            kodCol: 5,
            kod: d.hedefKodu,
            aciklama: d.hedefAdi || d.hedefKodu,
            tutar: tutarTopla(...hedefDallar.map(dalOdenek)),
          })
        }

        const phToplam = dalOdenek(d)
        satirlar.push({
          tur: 'performans_hedefi',
          etiket: 'Performans Hedefi',
          kodCol: 6,
          kod: d.phKodu,
          aciklama: d.phAdi,
          tutar: phToplam,
        })

        for (const pf of d.pfListe) {
          satirlar.push({
            tur: 'performans_faaliyeti',
            etiket: 'Performans Faaliyeti',
            kodCol: 7,
            kod: pf.kod,
            aciklama: pf.ad,
            tutar: pf.tutar,
          })
          for (const g of pf.gostergeler) {
            satirlar.push({
              tur: 'gosterge',
              etiket: 'Gösterge',
              kodCol: 8,
              kod: g.kod,
              aciklama: g.ad,
              tutar: g.hedef,
            })
            satirlar.push({
              tur: 'butce',
              etiket: 'Gösterge',
              kodCol: 8,
              kod: g.kod,
              aciklama: 'BÜTÇE',
              tutar: pf.tutar,
            })
          }
        }
      }

      return { mudurluk, satirlar }
    })
    .filter(s => s.satirlar.length > 0)

  return { yil, yillar, sekmeler }
}
