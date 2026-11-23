import type { SupabaseClient } from '@supabase/supabase-js'
import { ppKodSirala, ppPerformansYol } from '@/lib/pp-iliski'
import { ppRaporVarsayilanYil } from '@/lib/pp-mudurluk-rapor'
import { ppStratejikAmacEtiket } from '@/lib/pp-program-sp-rapor'

export type PpMudurlukProgramSpSatir = {
  programKodu: string
  altProgramKodu: string
  faaliyetKodu: string
  programAdi: string
  altProgramAdi: string
  faaliyetAdi: string
  stratejikAmac: string
  hedef: string
  performansHedefi: string
  mudurluk: string
  hedefKod: string
}

export type PpMudurlukProgramSpRapor = {
  yil: number
  yillar: number[]
  satirlar: PpMudurlukProgramSpSatir[]
}

function sayiParcasi(kodu: string | null | undefined, sira: number | null | undefined): string {
  const son = String(kodu ?? '').split('.').map(s => s.trim()).filter(Boolean).pop() ?? ''
  const sayi = son.replace(/sa|sh/gi, '').trim()
  if (sayi) return sayi
  return sira != null && Number.isFinite(Number(sira)) ? String(sira) : ''
}

function amacNumarasi(amac: { kodu: string | null; sira_no: number | null }): number {
  if (amac.sira_no != null && Number.isFinite(Number(amac.sira_no)) && Number(amac.sira_no) > 0) {
    return Number(amac.sira_no)
  }
  const m = String(amac.kodu ?? '').match(/(\d+)/)
  return m ? Number(m[1]) : 0
}

function hedefMetin(
  amac: { kodu: string | null; sira_no: number | null },
  hedef: { kodu: string | null; sira_no: number | null; hedef_adi: string | null },
): string {
  const a = sayiParcasi(amac.kodu, amac.sira_no)
  const h = sayiParcasi(hedef.kodu, hedef.sira_no)
  const kod = [a, h].filter(Boolean).join('.')
  const ad = String(hedef.hedef_adi ?? '').trim()
  return kod ? `${kod} ${ad}`.trim() : ad
}

/**
 * Müdürlük bazlı: KOD (program/alt/faaliyet) + PROGRAM + ALT PROGRAM + FAALİYET
 * + STRATEJİK AMAÇ + HEDEF + PERFORMANS HEDEFİ + İLGİLİ MÜDÜRLÜK
 */
export async function ppMudurlukProgramSpRaporYili(
  supabase: SupabaseClient,
  istenenYil: number | null,
): Promise<PpMudurlukProgramSpRapor> {
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
  if (!donem || !yillar.length) return { yil, yillar, satirlar: [] }

  const { data: programRaw } = await sb
    .from('performans_programi_program')
    .select('id, program_adi, kodu, sira_no')
    .eq('yil', yil)
  const programlar = (programRaw ?? []) as {
    id: number
    program_adi: string
    kodu: string | null
    sira_no: number | null
  }[]
  const programIds = programlar.map(p => p.id)
  if (!programIds.length) return { yil, yillar, satirlar: [] }

  const { data: altRaw } = await sb
    .from('performans_programi_alt_program')
    .select('id, program_id, alt_program_adi, kodu, sira_no')
    .in('program_id', programIds)
  const altlar = (altRaw ?? []) as {
    id: number
    program_id: number
    alt_program_adi: string
    kodu: string | null
    sira_no: number | null
  }[]
  const altIds = altlar.map(a => a.id)
  if (!altIds.length) return { yil, yillar, satirlar: [] }

  type Bag = {
    id: number
    alt_program_id: number
    alt_hedef_id: number
    faaliyet_id: number | null
    secilen_mudurluk: string | null
  }
  const { data: bagRaw } = await sb
    .from('performans_programi_alt_program_hedef')
    .select('id, alt_program_id, alt_hedef_id, faaliyet_id, secilen_mudurluk')
    .in('alt_program_id', altIds)
  const baglar = ((bagRaw ?? []) as Bag[]).filter(
    b => b.faaliyet_id != null && String(b.secilen_mudurluk ?? '').trim() !== '',
  )
  const sinifIds = [...new Set(baglar.map(b => Number(b.faaliyet_id)).filter(Number.isFinite))]
  const phIds = [...new Set(baglar.map(b => b.alt_hedef_id))]

  const { data: sinifRaw } = sinifIds.length
    ? await sb
      .from('performans_programi_pf_faaliyet')
      .select('id, faaliyet_adi, kodu, sira_no')
      .in('id', sinifIds)
    : { data: [] }
  const sinifById = new Map(
    ((sinifRaw ?? []) as { id: number; faaliyet_adi: string; kodu: string | null; sira_no: number | null }[])
      .map(f => [f.id, f]),
  )

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
  const phById = new Map(
    ((altHedefRaw ?? []) as {
      id: number
      hedef_id: number
      kodu: string | null
      sira_no: number | null
      alt_hedef_adi: string
    }[]).map(h => [h.id, h]),
  )

  const programById = new Map(programlar.map(p => [p.id, p]))
  const altById = new Map(altlar.map(a => [a.id, a]))

  const satirlar: PpMudurlukProgramSpSatir[] = []
  for (const bag of baglar) {
    const alt = altById.get(bag.alt_program_id)
    if (!alt) continue
    const program = programById.get(alt.program_id)
    if (!program) continue
    const sinif = sinifById.get(Number(bag.faaliyet_id))
    if (!sinif) continue
    const ph = phById.get(bag.alt_hedef_id)
    if (!ph) continue
    const hedef = hedefById.get(ph.hedef_id)
    if (!hedef) continue
    const amac = amacById.get(hedef.amac_id)
    if (!amac) continue
    const mudurluk = String(bag.secilen_mudurluk ?? '').trim()
    if (!mudurluk) continue

    const yol = ppPerformansYol(amac.kodu ?? '', hedef.kodu ?? '', ph.kodu ?? '')
    const hedefKod = yol || [
      sayiParcasi(amac.kodu, amac.sira_no),
      sayiParcasi(hedef.kodu, hedef.sira_no),
      sayiParcasi(ph.kodu, ph.sira_no),
    ].filter(Boolean).join('.')

    const amacNo = amacNumarasi(amac)
    satirlar.push({
      programKodu: String(program.kodu ?? '').trim() || sayiParcasi(program.kodu, program.sira_no),
      altProgramKodu: String(alt.kodu ?? '').trim() || sayiParcasi(alt.kodu, alt.sira_no),
      faaliyetKodu: String(sinif.kodu ?? '').trim() || sayiParcasi(sinif.kodu, sinif.sira_no),
      programAdi: program.program_adi,
      altProgramAdi: alt.alt_program_adi,
      faaliyetAdi: sinif.faaliyet_adi,
      stratejikAmac: ppStratejikAmacEtiket(amacNo, String(amac.amac_adi ?? '')),
      hedef: hedefMetin(amac, hedef),
      performansHedefi: hedefKod
        ? `${hedefKod} ${ph.alt_hedef_adi}`.trim()
        : ph.alt_hedef_adi,
      mudurluk,
      hedefKod,
    })
  }

  satirlar.sort((a, b) =>
    a.mudurluk.localeCompare(b.mudurluk, 'tr')
    || a.programAdi.localeCompare(b.programAdi, 'tr')
    || a.altProgramAdi.localeCompare(b.altProgramAdi, 'tr')
    || ppKodSirala(a.hedefKod, b.hedefKod)
    || a.faaliyetAdi.localeCompare(b.faaliyetAdi, 'tr'),
  )

  return { yil, yillar, satirlar }
}
