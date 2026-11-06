import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StratejikPlanBreadcrumb from '@/components/stratejik/StratejikPlanBreadcrumb'
import PpPerformansFaaliyetClient, { type PpPerformansFormBaslangic } from '@/components/stratejik/PpPerformansFaaliyetClient'
import { ppIliskiSecenekleri } from '../islemler/[donem_id]/[program_id]/iliski-actions'
import { ppParaYaz } from '@/lib/pp-iliski'

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
  const { data: gostergeRaw } = kayit
    ? await sb.from('performans_programi_pf_gosterge').select('sira_no, gosterge_adi, birim, aciklama, hesaplama_yontemi, t2_gerceklesme, t1_planlanan, t1_yil_sonu, t_hedef, t1_tahmin, t2_tahmin').eq('faaliyet_id', kayit.id).order('sira_no')
    : { data: [] }
  const yaz = (n: number | null) => ppParaYaz(n == null ? null : Number(n))
  const gostergeler = ((gostergeRaw ?? []) as {
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
  }[]).map(g => ({
    anahtar: `g-${kayit?.id}-${g.sira_no}`,
    ad: g.gosterge_adi,
    birim: g.birim,
    aciklama: g.aciklama ?? '',
    hesaplama: g.hesaplama_yontemi ?? '',
    t2: yaz(g.t2_gerceklesme),
    t1plan: yaz(g.t1_planlanan),
    t1son: yaz(g.t1_yil_sonu),
    thedef: yaz(g.t_hedef),
    t1tahmin: yaz(g.t1_tahmin),
    t2tahmin: yaz(g.t2_tahmin),
  }))
  const sira = kayit ? kayitlar.findIndex(f => f.id === kayit.id) + 1 : kayitlar.length + 1
  const baslangic: PpPerformansFormBaslangic = {
    faaliyetId: kayit?.id,
    ad: kayit?.faaliyet_adi ?? '',
    aciklama: kayit?.aciklama ?? '',
    sira,
    gostergeler,
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
