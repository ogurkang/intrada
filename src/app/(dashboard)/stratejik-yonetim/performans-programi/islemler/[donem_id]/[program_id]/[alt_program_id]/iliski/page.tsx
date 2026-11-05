import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PpAltProgramKayitClient, { type PpIliskiBaslangic } from '@/components/stratejik/PpAltProgramKayitClient'
import { ppParaYaz } from '@/lib/pp-iliski'
import { ppIliskiSecenekleri } from '../../iliski-actions'

export const dynamic = 'force-dynamic'

export default async function PpAltProgramIliskiPage({
  params,
}: {
  params: Promise<{ donem_id: string; program_id: string; alt_program_id: string }>
}) {
  const p = await params
  const yil = Number.parseInt(p.donem_id, 10)
  const programId = Number.parseInt(p.program_id, 10)
  const altId = Number.parseInt(p.alt_program_id, 10)
  if (!Number.isFinite(yil) || !Number.isFinite(programId) || !Number.isFinite(altId)) notFound()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const [{ data: program }, { data: alt }] = await Promise.all([
    sb.from('performans_programi_program').select('program_adi').eq('id', programId).eq('yil', yil).maybeSingle(),
    sb.from('performans_programi_alt_program').select('id, sira_no, kodu, alt_program_adi').eq('id', altId).eq('program_id', programId).maybeSingle(),
  ])
  if (!program || !alt) notFound()
  const { data: bag } = await sb.from('performans_programi_alt_program_hedef').select('id, alt_hedef_id, gerekce').eq('alt_program_id', altId).limit(1).maybeSingle()
  const { data: faaliyetRaw } = bag
    ? await sb.from('performans_programi_pf_faaliyet').select('id, sira_no, faaliyet_adi').eq('bag_id', bag.id).order('sira_no')
    : { data: [] }
  const faaliyetler = (faaliyetRaw ?? []) as { id: number; sira_no: number; faaliyet_adi: string }[]
  const faaliyetIds = faaliyetler.map(f => f.id)
  const { data: gostergeRaw } = faaliyetIds.length
    ? await sb.from('performans_programi_pf_gosterge').select('faaliyet_id, sira_no, gosterge_adi, birim, aciklama, hesaplama_yontemi, t2_gerceklesme, t1_planlanan, t1_yil_sonu, t_hedef, t1_tahmin, t2_tahmin').in('faaliyet_id', faaliyetIds).order('sira_no')
    : { data: [] }
  const gostergeler = (gostergeRaw ?? []) as {
    faaliyet_id: number
    sira_no: number
    gosterge_adi: string
    birim: string
    aciklama: string
    hesaplama_yontemi: string
    t2_gerceklesme: number | null
    t1_planlanan: number | null
    t1_yil_sonu: number | null
    t_hedef: number | null
    t1_tahmin: number | null
    t2_tahmin: number | null
  }[]
  const baslangic: PpIliskiBaslangic = {
    altProgramId: altId,
    sira: alt.sira_no == null ? '' : String(alt.sira_no),
    kodu: String(alt.kodu ?? ''),
    ad: String(alt.alt_program_adi ?? ''),
    altHedefId: bag ? String(bag.alt_hedef_id) : '',
    gerekce: String(bag?.gerekce ?? ''),
    faaliyetler: faaliyetler.map(f => ({
      anahtar: `f-${f.id}`,
      ad: f.faaliyet_adi,
      gostergeler: gostergeler.filter(g => g.faaliyet_id === f.id).map(g => ({
        anahtar: `g-${f.id}-${g.sira_no}`,
        ad: g.gosterge_adi,
        birim: g.birim,
        aciklama: g.aciklama ?? '',
        hesaplama: g.hesaplama_yontemi ?? '',
        t2: ppParaYaz(g.t2_gerceklesme == null ? null : Number(g.t2_gerceklesme)),
        t1plan: ppParaYaz(g.t1_planlanan == null ? null : Number(g.t1_planlanan)),
        t1son: ppParaYaz(g.t1_yil_sonu == null ? null : Number(g.t1_yil_sonu)),
        thedef: ppParaYaz(g.t_hedef == null ? null : Number(g.t_hedef)),
        t1tahmin: ppParaYaz(g.t1_tahmin == null ? null : Number(g.t1_tahmin)),
        t2tahmin: ppParaYaz(g.t2_tahmin == null ? null : Number(g.t2_tahmin)),
      })),
    })),
  }
  const { secenekler, hata } = await ppIliskiSecenekleri()
  return (
    <div className="space-y-4">
      {hata ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{hata}</p> : null}
      <PpAltProgramKayitClient
        yil={yil}
        programId={programId}
        programAdi={String(program.program_adi ?? '')}
        secenekler={secenekler}
        baslangic={baslangic}
      />
    </div>
  )
}
