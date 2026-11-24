import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StratejikPlanBreadcrumb from '@/components/stratejik/StratejikPlanBreadcrumb'
import PpPerformansFaaliyetClient, { type PpPerformansFormBaslangic } from '@/components/stratejik/PpPerformansFaaliyetClient'
import { ppIliskiSecenekleri } from '../islemler/[donem_id]/[program_id]/iliski-actions'

export default async function PpPerformansFaaliyetFormSayfa({
  bagId,
  faaliyetId,
}: {
  bagId: number
  faaliyetId?: number
}) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const [{ data: bag }, sec] = await Promise.all([
    sb.from('performans_programi_alt_program_hedef').select('id, alt_hedef_id, faaliyet_id, alt_program_id').eq('id', bagId).maybeSingle(),
    ppIliskiSecenekleri(),
  ])
  if (!bag) notFound()
  const hedefFaaliyetId = Number(bag.faaliyet_id)
  const altId = Number(bag.alt_program_id)
  const { data: alt } = await sb.from('performans_programi_alt_program').select('id, program_id').eq('id', altId).maybeSingle()
  if (!alt) notFound()
  const programId = Number(alt.program_id)
  const { data: program } = await sb.from('performans_programi_program').select('id, yil').eq('id', programId).maybeSingle()
  if (!program) notFound()
  const yil = Number(program.yil)
  const aciklamali = await sb.from('performans_programi_pf_faaliyet').select('id, sira_no, faaliyet_adi, aciklama').eq('bag_id', bagId).order('sira_no')
  const siraSorgu = aciklamali.error
    ? await sb.from('performans_programi_pf_faaliyet').select('id, sira_no, faaliyet_adi').eq('bag_id', bagId).order('sira_no')
    : aciklamali
  const kayitlar = (siraSorgu.data ?? []) as { id: number; sira_no: number; faaliyet_adi: string; aciklama?: string | null }[]
  const kayit = faaliyetId ? kayitlar.find(f => f.id === faaliyetId) : undefined
  if (faaliyetId && !kayit) notFound()

  let gostergeSayisi = 0
  if (kayit) {
    const { count } = await sb
      .from('performans_programi_pf_gosterge')
      .select('id', { count: 'exact', head: true })
      .eq('faaliyet_id', kayit.id)
    gostergeSayisi = count ?? 0
  }

  let sira = kayit?.sira_no ?? 0
  if (!kayit) {
    const altHedefId = Number(bag.alt_hedef_id)
    const { data: baglar } = Number.isFinite(altHedefId)
      ? await sb.from('performans_programi_alt_program_hedef').select('id').eq('alt_hedef_id', altHedefId)
      : { data: [] }
    const bagIds = ((baglar ?? []) as { id: number }[]).map(b => Number(b.id)).filter(Number.isFinite)
    const { data: tum } = bagIds.length
      ? await sb.from('performans_programi_pf_faaliyet').select('sira_no').in('bag_id', bagIds)
      : { data: [] }
    const nolar = ((tum ?? []) as { sira_no: number | null }[]).map(r => Number(r.sira_no)).filter(Number.isFinite)
    sira = (nolar.length ? Math.max(...nolar) : 0) + 1
  }
  const baslangic: PpPerformansFormBaslangic = {
    faaliyetId: kayit?.id,
    ad: kayit?.faaliyet_adi ?? '',
    aciklama: kayit?.aciklama ?? '',
    sira,
    gostergeSayisi,
  }
  const ph = sec.secenekler.find(s => s.id === Number(bag.alt_hedef_id))
  return (
    <div className="space-y-4">
      <StratejikPlanBreadcrumb items={[
        { label: 'İşlemler', href: '/stratejik-yonetim/performans-programi/islemler' },
        { label: 'Programlar', href: `/stratejik-yonetim/performans-programi/islemler/${yil}` },
        { label: 'Alt Programlar', href: `/stratejik-yonetim/performans-programi/islemler/${yil}/${programId}` },
        { label: 'Faaliyetler', href: `/stratejik-yonetim/performans-programi/islemler/${yil}/${programId}/${altId}/faaliyetler` },
        { label: 'Alt Program Hedefleri', href: `/stratejik-yonetim/performans-programi/islemler/${yil}/${programId}/${altId}/faaliyetler/${hedefFaaliyetId}` },
        { label: 'Performans Faaliyetleri', href: `/stratejik-yonetim/performans-programi/hedef/${bagId}` },
        { label: kayit ? 'Düzenle' : 'Ekle' },
      ]} />
      <PpPerformansFaaliyetClient yil={yil} bagId={bagId} phKod={ph?.kod ?? ''} baslangic={baslangic} />
    </div>
  )
}
