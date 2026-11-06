import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StratejikPlanBreadcrumb from '@/components/stratejik/StratejikPlanBreadcrumb'
import PpPfOdenekClient, { type PpOdenekKodSatir } from '@/components/stratejik/PpPfOdenekClient'
import { fetchAllTable } from '@/lib/supabase-sayfala'

export const dynamic = 'force-dynamic'

export default async function PpPfOdenekPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const p = await params
  const faaliyetId = Number.parseInt(p.id, 10)
  if (!Number.isFinite(faaliyetId)) notFound()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data: faaliyet } = await sb.from('performans_programi_pf_faaliyet').select('id, faaliyet_adi, bag_id').eq('id', faaliyetId).maybeSingle()
  const bagId = Number(faaliyet?.bag_id)
  if (!faaliyet || !Number.isFinite(bagId)) notFound()
  const { data: bag } = await sb.from('performans_programi_alt_program_hedef').select('id, alt_program_id, faaliyet_id').eq('id', bagId).maybeSingle()
  if (!bag) notFound()
  const { data: alt } = await sb.from('performans_programi_alt_program').select('id, program_id').eq('id', bag.alt_program_id).maybeSingle()
  if (!alt) notFound()
  const { data: program } = await sb.from('performans_programi_program').select('id, yil').eq('id', alt.program_id).maybeSingle()
  if (!program) notFound()
  const yil = Number(program.yil)
  const kodSorgu = await fetchAllTable<{ id: number; ekonomik_kod: string; hesap_adi: string }>(sb, 'performans_programi_butce_kodu', 'id, ekonomik_kod, hesap_adi', {
    orderColumn: 'ekonomik_kod',
    apply: q => q.eq('aktif', true),
  })
  const { data: odenekRaw, error: odenekHata } = await sb.from('performans_programi_pf_odenek').select('butce_kodu_id, t1_butce, t1_haziran, t1_yil_sonu, t_butce, t1_tahmin, t2_tahmin').eq('pf_faaliyet_id', faaliyetId)
  const odenek = new Map<number, PpOdenekKodSatir>()
  if (!odenekHata) {
    for (const r of odenekRaw ?? []) {
      const satir = r as { butce_kodu_id: number; t1_butce: number | null; t1_haziran: number | null; t1_yil_sonu: number | null; t_butce: number | null; t1_tahmin: number | null; t2_tahmin: number | null }
      odenek.set(Number(satir.butce_kodu_id), {
        butce_kodu_id: Number(satir.butce_kodu_id),
        ekonomik_kod: '',
        hesap_adi: '',
        t1Butce: satir.t1_butce == null ? null : Number(satir.t1_butce),
        t1Haziran: satir.t1_haziran == null ? null : Number(satir.t1_haziran),
        t1YilSonu: satir.t1_yil_sonu == null ? null : Number(satir.t1_yil_sonu),
        tButce: satir.t_butce == null ? null : Number(satir.t_butce),
        t1Tahmin: satir.t1_tahmin == null ? null : Number(satir.t1_tahmin),
        t2Tahmin: satir.t2_tahmin == null ? null : Number(satir.t2_tahmin),
      })
    }
  }
  const kodlar: PpOdenekKodSatir[] = (kodSorgu.data ?? []).map(k => {
    const varOlan = odenek.get(k.id)
    return {
      butce_kodu_id: k.id,
      ekonomik_kod: k.ekonomik_kod,
      hesap_adi: k.hesap_adi,
      t1Butce: varOlan?.t1Butce ?? null,
      t1Haziran: varOlan?.t1Haziran ?? null,
      t1YilSonu: varOlan?.t1YilSonu ?? null,
      tButce: varOlan?.tButce ?? null,
      t1Tahmin: varOlan?.t1Tahmin ?? null,
      t2Tahmin: varOlan?.t2Tahmin ?? null,
    }
  })
  return (
    <div className="space-y-4">
      <StratejikPlanBreadcrumb items={[
        { label: 'İşlemler', href: '/stratejik-yonetim/performans-programi/islemler' },
        { label: 'Programlar', href: `/stratejik-yonetim/performans-programi/islemler/${yil}` },
        { label: 'Alt Programlar', href: `/stratejik-yonetim/performans-programi/islemler/${yil}/${alt.program_id}` },
        { label: 'Faaliyetler', href: `/stratejik-yonetim/performans-programi/islemler/${yil}/${alt.program_id}/${bag.alt_program_id}/faaliyetler` },
        { label: 'Alt Program Hedefleri', href: `/stratejik-yonetim/performans-programi/islemler/${yil}/${alt.program_id}/${bag.alt_program_id}/faaliyetler/${bag.faaliyet_id}` },
        { label: 'Performans Faaliyetleri', href: `/stratejik-yonetim/performans-programi/hedef/${bagId}` },
        { label: 'Ödenek' },
      ]} />
      {odenekHata ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Ödenek tablosu için 20261106140000_pp_faaliyet_aciklama_odenek.sql dosyasını çalıştırın.</p> : null}
      <PpPfOdenekClient yil={yil} faaliyetId={faaliyetId} baslik={String(faaliyet.faaliyet_adi ?? 'Ödenek teklifi')} kodlar={kodlar} />
    </div>
  )
}
