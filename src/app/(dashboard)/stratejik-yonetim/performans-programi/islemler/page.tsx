import { createClient } from '@/lib/supabase/server'
import PerformansProgramiDonemClient, {
  type PpDonem,
  type PpHizliYil,
} from '@/components/stratejik/PerformansProgramiDonemClient'
import { ppIliskiSecenekleri } from './[donem_id]/[program_id]/iliski-actions'

export default async function PerformansProgramiIslemlerPage() {
  const supabase = await createClient()
  const { data: aktifDonem } = await supabase
    .from('stratejik_plan_donem' as never)
    .select('id, donem_adi, baslangic_tarihi, bitis_tarihi, aktif')
    .eq('aktif', true)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  const secili = (aktifDonem ?? null) as unknown as {
    id: number
    baslangic_tarihi: string
    bitis_tarihi: string
  } | null
  if (!secili) return <PerformansProgramiDonemClient donemler={[]} hizli={[]} />

  const ilkYil = Number.parseInt(String(secili.baslangic_tarihi ?? '').slice(0, 4), 10)
  const sonYil = Number.parseInt(String(secili.bitis_tarihi ?? '').slice(0, 4), 10)
  if (!Number.isFinite(ilkYil) || !Number.isFinite(sonYil) || sonYil < ilkYil) {
    return <PerformansProgramiDonemClient donemler={[]} hizli={[]} />
  }

  const donemler: PpDonem[] = []
  for (let yil = ilkYil; yil <= sonYil; yil += 1) {
    donemler.push({
      id: Number(`${secili.id}${yil}`),
      yil,
      donem_adi: `${yil} Yılı Performans Programı`,
      baslangic_tarihi: `${yil}-01-01`,
      bitis_tarihi: `${yil}-12-31`,
    })
  }

  const yillar = donemler.map(d => d.yil)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const [{ data: programRaw }, sec] = await Promise.all([
    sb.from('performans_programi_program').select('id, yil, program_adi, sira_no').in('yil', yillar).order('sira_no'),
    ppIliskiSecenekleri(),
  ])
  const programlar = (programRaw ?? []) as { id: number; yil: number; program_adi: string; sira_no: number | null }[]
  const programIds = programlar.map(p => p.id)
  const { data: altRaw } = programIds.length
    ? await sb.from('performans_programi_alt_program').select('id, program_id, alt_program_adi, sira_no').in('program_id', programIds).order('sira_no')
    : { data: [] }
  const altlar = (altRaw ?? []) as { id: number; program_id: number; alt_program_adi: string }[]
  const altIds = altlar.map(a => a.id)
  const { data: faaliyetRaw } = altIds.length
    ? await sb.from('performans_programi_pf_faaliyet').select('id, alt_program_id, faaliyet_adi, sira_no').in('alt_program_id', altIds).order('sira_no')
    : { data: [] }
  const faaliyetler = (faaliyetRaw ?? []) as { id: number; alt_program_id: number; faaliyet_adi: string }[]
  const faaliyetIds = faaliyetler.map(f => f.id)
  const { data: hedefRaw } = faaliyetIds.length
    ? await sb.from('performans_programi_alt_program_hedef').select('id, faaliyet_id, alt_hedef_id').in('faaliyet_id', faaliyetIds)
    : { data: [] }
  const hedefler = (hedefRaw ?? []) as { id: number; faaliyet_id: number; alt_hedef_id: number }[]
  const adById = new Map(sec.secenekler.map(s => [s.id, s.kod ? `${s.kod} ${s.ad}` : s.ad]))
  const hizli: PpHizliYil[] = yillar.map(yil => ({
    yil,
    programlar: programlar.filter(p => Number(p.yil) === yil).sort((a, b) => (a.sira_no ?? 0) - (b.sira_no ?? 0) || a.id - b.id).map(p => ({
      id: p.id,
      ad: p.program_adi,
      altlar: altlar.filter(a => a.program_id === p.id).map(a => ({
        id: a.id,
        ad: a.alt_program_adi,
        faaliyetler: faaliyetler.filter(f => f.alt_program_id === a.id).map(f => ({
          id: f.id,
          ad: f.faaliyet_adi,
          hedefler: hedefler.filter(h => h.faaliyet_id === f.id).map(h => ({
            id: h.id,
            ad: adById.get(h.alt_hedef_id) ?? 'Performans hedefi',
          })),
        })),
      })),
    })),
  }))

  return <PerformansProgramiDonemClient donemler={donemler} hizli={hizli} />
}
