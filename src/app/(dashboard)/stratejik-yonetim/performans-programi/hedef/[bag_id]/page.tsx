import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StratejikPlanBreadcrumb from '@/components/stratejik/StratejikPlanBreadcrumb'
import PpPerformansFaaliyetListeClient, { type PpMaliyetToplam, type PpPerformansFaaliyetSatir } from '@/components/stratejik/PpPerformansFaaliyetListeClient'
import { ppIliskiSecenekleri } from '../../islemler/[donem_id]/[program_id]/iliski-actions'
import { ppFaaliyetKodu } from '@/lib/pp-iliski'

export const dynamic = 'force-dynamic'

export default async function PpPerformansFaaliyetPage({
  params,
}: {
  params: Promise<{ bag_id: string }>
}) {
  const p = await params
  const bagId = Number.parseInt(p.bag_id, 10)
  if (!Number.isFinite(bagId)) notFound()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const [{ data: bag }, { data: raw }, sec] = await Promise.all([
    sb.from('performans_programi_alt_program_hedef').select('id, alt_hedef_id, faaliyet_id, alt_program_id').eq('id', bagId).maybeSingle(),
    sb.from('performans_programi_pf_faaliyet').select('id, sira_no, faaliyet_adi').eq('bag_id', bagId).order('sira_no'),
    ppIliskiSecenekleri(),
  ])
  if (!bag) notFound()
  const faaliyetId = Number(bag.faaliyet_id)
  const altId = Number(bag.alt_program_id)
  const { data: alt } = await sb.from('performans_programi_alt_program').select('id, program_id').eq('id', altId).maybeSingle()
  if (!alt) notFound()
  const programId = Number(alt.program_id)
  const { data: program } = await sb.from('performans_programi_program').select('id, yil').eq('id', programId).maybeSingle()
  if (!program) notFound()
  const yil = Number(program.yil)
  const kayitlar = (raw ?? []) as { id: number; sira_no: number; faaliyet_adi: string }[]
  const ids = kayitlar.map(f => f.id)
  const { data: gostergeRaw } = ids.length
    ? await sb.from('performans_programi_pf_gosterge').select('faaliyet_id').in('faaliyet_id', ids)
    : { data: [] }
  const gostergeSay = new Map<number, number>()
  for (const g of gostergeRaw ?? []) {
    const id = Number((g as { faaliyet_id?: number }).faaliyet_id)
    if (Number.isFinite(id)) gostergeSay.set(id, (gostergeSay.get(id) ?? 0) + 1)
  }
  const odenekSorgu = ids.length
    ? await sb.from('performans_programi_pf_odenek').select('pf_faaliyet_id, t1_butce, t1_haziran, t1_yil_sonu, t_butce, t1_tahmin, t2_tahmin').in('pf_faaliyet_id', ids)
    : { data: [] as unknown[], error: null }
  const maliyet = new Map<number, PpMaliyetToplam>()
  const bos = (): PpMaliyetToplam => ({ t1Butce: 0, t1Haziran: 0, t1YilSonu: 0, tButce: 0, t1Tahmin: 0, t2Tahmin: 0 })
  if (!odenekSorgu.error) {
    for (const r of odenekSorgu.data ?? []) {
      const satir = r as { pf_faaliyet_id?: number; t1_butce?: number | null; t1_haziran?: number | null; t1_yil_sonu?: number | null; t_butce?: number | null; t1_tahmin?: number | null; t2_tahmin?: number | null }
      const id = Number(satir.pf_faaliyet_id)
      if (!Number.isFinite(id)) continue
      const toplam = maliyet.get(id) ?? bos()
      toplam.t1Butce += Number(satir.t1_butce ?? 0)
      toplam.t1Haziran += Number(satir.t1_haziran ?? 0)
      toplam.t1YilSonu += Number(satir.t1_yil_sonu ?? 0)
      toplam.tButce += Number(satir.t_butce ?? 0)
      toplam.t1Tahmin += Number(satir.t1_tahmin ?? 0)
      toplam.t2Tahmin += Number(satir.t2_tahmin ?? 0)
      maliyet.set(id, toplam)
    }
  }
  const ph = sec.secenekler.find(s => s.id === Number(bag.alt_hedef_id))
  const satirlar: PpPerformansFaaliyetSatir[] = kayitlar.map(f => ({
    id: f.id,
    sira: f.sira_no,
    kod: ppFaaliyetKodu(ph?.kod ?? '', f.sira_no),
    ad: f.faaliyet_adi,
    gostergeSayisi: gostergeSay.get(f.id) ?? 0,
    maliyet: maliyet.get(f.id) ?? bos(),
  }))
  return (
    <div className="space-y-4">
      <StratejikPlanBreadcrumb items={[
        { label: 'İşlemler', href: '/stratejik-yonetim/performans-programi/islemler' },
        { label: 'Programlar', href: `/stratejik-yonetim/performans-programi/islemler/${yil}` },
        { label: 'Alt Programlar', href: `/stratejik-yonetim/performans-programi/islemler/${yil}/${programId}` },
        { label: 'Faaliyetler', href: `/stratejik-yonetim/performans-programi/islemler/${yil}/${programId}/${altId}/faaliyetler` },
        { label: 'Alt Program Hedefleri', href: `/stratejik-yonetim/performans-programi/islemler/${yil}/${programId}/${altId}/faaliyetler/${faaliyetId}` },
        { label: 'Performans Faaliyetleri' },
      ]} />
      <PpPerformansFaaliyetListeClient yil={yil} bagId={bagId} baslik={ph?.ad ?? 'Performans faaliyetleri'} satirlar={satirlar} />
    </div>
  )
}
