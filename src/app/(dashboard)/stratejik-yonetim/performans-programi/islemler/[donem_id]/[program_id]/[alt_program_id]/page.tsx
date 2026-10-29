import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PpAltProgramHedefClient, { type PpFaaliyetSatir, type PpHedefKart } from '@/components/stratejik/PpAltProgramHedefClient'
import { getKullaniciGorevMudurlukleri } from '@/lib/kullanici-mudurluk'
import { ppMaliyetSeciciMi, ppNorm, ppOturum } from '@/lib/pp-erisim'

function sayiParcasi(kodu: string | null | undefined, sira: number | null | undefined): string {
  const son = String(kodu ?? '').split('.').map(s => s.trim()).filter(Boolean).pop() ?? ''
  const sayi = son.replace(/sa|sh/gi, '').trim()
  if (sayi) return sayi
  return sira != null && Number.isFinite(Number(sira)) ? String(sira) : ''
}

export default async function AltProgramHedefiPage({
  params,
}: {
  params: Promise<{ donem_id: string; program_id: string; alt_program_id: string }>
}) {
  const p = await params
  const yil = Number.parseInt(p.donem_id, 10)
  const programId = Number.parseInt(p.program_id, 10)
  const altProgramId = Number.parseInt(p.alt_program_id, 10)
  if (!Number.isFinite(yil) || !Number.isFinite(programId) || !Number.isFinite(altProgramId)) notFound()

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data: alt } = await sb
    .from('performans_programi_alt_program')
    .select('id, kodu, alt_program_adi, program_id')
    .eq('id', altProgramId)
    .eq('program_id', programId)
    .maybeSingle()
  if (!alt) notFound()

  const { data: donemRaw } = await sb.from('stratejik_plan_donem').select('id, baslangic_tarihi, bitis_tarihi').order('id', { ascending: false })
  const donem = (donemRaw ?? []).find((d: { baslangic_tarihi: string; bitis_tarihi: string }) => {
    const a = Number(String(d.baslangic_tarihi).slice(0, 4))
    const b = Number(String(d.bitis_tarihi).slice(0, 4))
    return yil >= a && yil <= b
  })
  const { data: amacRaw } = donem
    ? await sb.from('stratejik_plan_amac').select('id, kodu, sira_no').eq('donem_id', donem.id)
    : { data: [] }
  const amaclar = (amacRaw ?? []) as { id: number; kodu: string; sira_no: number | null }[]
  const amacIds = amaclar.map(a => a.id)
  const { data: hedefRaw } = amacIds.length
    ? await sb.from('stratejik_plan_hedef').select('id, amac_id, kodu, sira_no').in('amac_id', amacIds)
    : { data: [] }
  const hedefler = (hedefRaw ?? []) as { id: number; amac_id: number; kodu: string; sira_no: number | null }[]
  const hedefIds = hedefler.map(h => h.id)
  const { data: altHedefRaw } = hedefIds.length
    ? await sb.from('stratejik_plan_alt_hedef').select('id, hedef_id, kodu, sira_no, alt_hedef_adi, mudurluk').in('hedef_id', hedefIds).eq('aktif', true).order('kodu')
    : { data: [] }
  const altHedefler = (altHedefRaw ?? []) as { id: number; hedef_id: number; kodu: string; sira_no: number | null; alt_hedef_adi: string; mudurluk: string }[]
  const altHedefIds = altHedefler.map(h => h.id)
  const { data: faaliyetRaw } = altHedefIds.length
    ? await sb.from('stratejik_plan_faaliyet').select('id, alt_hedef_id, sira_no, faaliyet_adi').in('alt_hedef_id', altHedefIds).eq('aktif', true).order('sira_no')
    : { data: [] }
  const faaliyetler = faaliyetRaw ?? []
  const { data: gostergeRaw } = altHedefIds.length
    ? await sb.from('stratejik_plan_gosterge').select('faaliyet_id, gosterge_adi').in('alt_hedef_id', altHedefIds)
    : { data: [] }
  const gostergeler = (gostergeRaw ?? []) as { faaliyet_id: number | null; gosterge_adi: string }[]
  const { data: ozelRaw } = await sb
    .from('performans_programi_ozel_faaliyet')
    .select('id, alt_hedef_id, sira_no, faaliyet_adi')
    .eq('alt_program_id', altProgramId)
    .eq('yil', yil)
  const ozelFaaliyetler = (ozelRaw ?? []) as { id: number; alt_hedef_id: number; sira_no: number | null; faaliyet_adi: string }[]
  const faaliyetIds = faaliyetler.map((f: { id: number }) => f.id)
  const ozelIds = ozelFaaliyetler.map(f => f.id)
  const [{ data: butceRaw }, { data: ozelButceRaw }, { data: logRaw }] = await Promise.all([
    faaliyetIds.length
      ? sb.from('performans_programi_faaliyet_butce').select('faaliyet_id, butce_kodu_id, tutar, mudurluk').eq('yil', yil).in('faaliyet_id', faaliyetIds)
      : Promise.resolve({ data: [] }),
    ozelIds.length
      ? sb.from('performans_programi_ozel_faaliyet_butce').select('ozel_faaliyet_id, butce_kodu_id, tutar, mudurluk').eq('yil', yil).in('ozel_faaliyet_id', ozelIds)
      : Promise.resolve({ data: [] }),
    sb.from('performans_programi_maliyet_log').select('id, faaliyet_id, ozel_faaliyet_id, metin, kullanici_adi, created_at').eq('alt_program_id', altProgramId).eq('yil', yil).order('created_at', { ascending: false }),
  ])
  const mudurlukByAltHedef = new Map<number, string>(altHedefler.map(h => [h.id, h.mudurluk]))
  type ButceSatir = { anahtar: string; altHedefId: number; butceKoduId: number; tutar: number; mudurluk: string }
  const butceSatirlari: ButceSatir[] = []
  for (const r of butceRaw ?? []) {
    const id = Number((r as { faaliyet_id?: number }).faaliyet_id)
    const faaliyet = faaliyetler.find((f: { id: number; alt_hedef_id: number }) => f.id === id)
    if (!faaliyet) continue
    butceSatirlari.push({
      anahtar: `s-${id}`,
      altHedefId: faaliyet.alt_hedef_id,
      butceKoduId: Number((r as { butce_kodu_id?: number }).butce_kodu_id),
      tutar: Number((r as { tutar?: number }).tutar ?? 0),
      mudurluk: String((r as { mudurluk?: string }).mudurluk ?? ''),
    })
  }
  for (const r of ozelButceRaw ?? []) {
    const id = Number((r as { ozel_faaliyet_id?: number }).ozel_faaliyet_id)
    const faaliyet = ozelFaaliyetler.find(f => f.id === id)
    if (!faaliyet) continue
    butceSatirlari.push({
      anahtar: `o-${id}`,
      altHedefId: faaliyet.alt_hedef_id,
      butceKoduId: Number((r as { butce_kodu_id?: number }).butce_kodu_id),
      tutar: Number((r as { tutar?: number }).tutar ?? 0),
      mudurluk: String((r as { mudurluk?: string }).mudurluk ?? ''),
    })
  }
  const kodIds = [...new Set(butceSatirlari.map(s => s.butceKoduId).filter(Number.isFinite))]
  const { data: kodRaw } = kodIds.length
    ? await sb.from('performans_programi_butce_kodu').select('id, ekonomik_kod, hesap_adi').in('id', kodIds)
    : { data: [] }
  const kodAd = new Map<number, { kod: string; ad: string }>(
    (kodRaw ?? []).map((k: { id: number; ekonomik_kod: string; hesap_adi: string }) => [k.id, { kod: k.ekonomik_kod, ad: k.hesap_adi }]),
  )
  const toplamByAnahtar = new Map<string, number>()
  const girilenByAnahtar = new Map<string, { kod: string; ad: string; tutar: number }[]>()
  for (const s of butceSatirlari) {
    const beklenen = mudurlukByAltHedef.get(s.altHedefId)
    if (ppNorm(s.mudurluk) !== ppNorm(beklenen)) continue
    toplamByAnahtar.set(s.anahtar, (toplamByAnahtar.get(s.anahtar) ?? 0) + s.tutar)
    if (!(s.tutar > 0)) continue
    const kod = kodAd.get(s.butceKoduId)
    const liste = girilenByAnahtar.get(s.anahtar) ?? []
    liste.push({ kod: kod?.kod ?? '', ad: kod?.ad ?? '', tutar: s.tutar })
    girilenByAnahtar.set(s.anahtar, liste)
  }
  const logByAnahtar = new Map<string, { id: number; zaman: string; kisi: string; metin: string }[]>()
  for (const r of logRaw ?? []) {
    const faaliyetId = (r as { faaliyet_id?: number | null }).faaliyet_id
    const ozelId = (r as { ozel_faaliyet_id?: number | null }).ozel_faaliyet_id
    const anahtar = ozelId ? `o-${ozelId}` : faaliyetId ? `s-${faaliyetId}` : ''
    if (!anahtar) continue
    const liste = logByAnahtar.get(anahtar) ?? []
    liste.push({
      id: Number((r as { id?: number }).id),
      zaman: String((r as { created_at?: string }).created_at ?? ''),
      kisi: String((r as { kullanici_adi?: string }).kullanici_adi ?? ''),
      metin: String((r as { metin?: string }).metin ?? ''),
    })
    logByAnahtar.set(anahtar, liste)
  }
  const ot = await ppOturum(supabase)
  const secici = ot ? await ppMaliyetSeciciMi(supabase, ot.access) : false
  const kendi = new Set<string>()
  if (ot && !secici && ot.access.mode === 'kullanici') {
    const { mudurlukler } = await getKullaniciGorevMudurlukleri(supabase, ot.access.sicilNo)
    for (const m of mudurlukler) kendi.add(ppNorm(m))
  }

  const amacById = new Map(amaclar.map(a => [a.id, a]))
  const hedefById = new Map(hedefler.map(h => [h.id, h]))

  function kart(h: { id: number; hedef_id: number; kodu: string; sira_no: number | null; alt_hedef_adi: string; mudurluk: string }): PpHedefKart {
    const maliyetAcik = secici || kendi.has(ppNorm(h.mudurluk))
    const hedef = hedefById.get(h.hedef_id)
    const amac = hedef ? amacById.get(hedef.amac_id) : undefined
    const kok = [sayiParcasi(amac?.kodu, amac?.sira_no), sayiParcasi(hedef?.kodu, hedef?.sira_no), sayiParcasi(h.kodu, h.sira_no)]
    const planSatir: PpFaaliyetSatir[] = faaliyetler
      .filter((f: { alt_hedef_id: number }) => f.alt_hedef_id === h.id)
      .map((f: { id: number; sira_no: number | null; faaliyet_adi: string }, i: number) => satirYap(f.id, false, f.sira_no ?? i + 1, kok, f.faaliyet_adi, gostergeler.filter(g => g.faaliyet_id === f.id).map(g => g.gosterge_adi), maliyetAcik))
    const ozelSatir: PpFaaliyetSatir[] = ozelFaaliyetler
      .filter(f => f.alt_hedef_id === h.id)
      .map(f => satirYap(f.id, true, f.sira_no ?? 0, kok, f.faaliyet_adi, [], maliyetAcik))
    return {
      id: h.id,
      kodu: h.kodu,
      ad: h.alt_hedef_adi,
      mudurluk: h.mudurluk,
      maliyetAcik,
      faaliyetler: [...planSatir, ...ozelSatir].sort((a, b) => a.sira - b.sira || a.ad.localeCompare(b.ad, 'tr')),
    }
  }

  function satirYap(id: number, ozel: boolean, sira: number, kok: string[], ad: string, gosterge: string[], maliyetAcik: boolean): PpFaaliyetSatir {
    const anahtar = `${ozel ? 'o' : 's'}-${id}`
    return {
      id,
      ozel,
      sira,
      kod: [...kok, String(sira)].filter(Boolean).join('.'),
      ad,
      gostergeler: gosterge,
      toplam: maliyetAcik ? (toplamByAnahtar.get(anahtar) ?? 0) : 0,
      girilen: maliyetAcik ? (girilenByAnahtar.get(anahtar) ?? []) : [],
      loglar: maliyetAcik ? (logByAnahtar.get(anahtar) ?? []) : [],
    }
  }

  const { data: bagRaw } = await sb.from('performans_programi_alt_program_hedef').select('alt_hedef_id').eq('alt_program_id', altProgramId)
  const bagliIds = new Set((bagRaw ?? []).map((r: { alt_hedef_id: number }) => r.alt_hedef_id))
  const baglilar = altHedefler.filter((h: { id: number }) => bagliIds.has(h.id)).map(kart)
  const secenekler = altHedefler.filter((h: { id: number }) => !bagliIds.has(h.id)).map(kart)

  return (
    <div className="space-y-4">
      <PpAltProgramHedefClient
        baslik={`${alt.kodu ?? ''} ${alt.alt_program_adi}`.trim()}
        baglilar={baglilar}
        secenekler={secenekler}
        altProgramId={altProgramId}
        yil={yil}
        programId={programId}
      />
    </div>
  )
}
