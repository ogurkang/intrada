import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StratejikPlanBreadcrumb from '@/components/stratejik/StratejikPlanBreadcrumb'
import PpPfGostergeListeClient, {
  type PpPfGostergeListeSatir,
  type PpMaliyetToplam,
} from '@/components/stratejik/PpPfGostergeListeClient'
import { ppIliskiSecenekleri } from '../../../islemler/[donem_id]/[program_id]/iliski-actions'
import { ppFaaliyetKodu, ppGostergeKodu } from '@/lib/pp-iliski'

export const dynamic = 'force-dynamic'

export default async function PpPfGostergeListePage({
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

  const kurumlu = await sb
    .from('performans_programi_pf_faaliyet')
    .select('id, bag_id, sira_no, faaliyet_adi, kurum_ici')
    .eq('id', faaliyetId)
    .maybeSingle()
  const faaliyetRes = kurumlu.error
    ? await sb
        .from('performans_programi_pf_faaliyet')
        .select('id, bag_id, sira_no, faaliyet_adi')
        .eq('id', faaliyetId)
        .maybeSingle()
    : kurumlu
  const faaliyet = faaliyetRes.data as {
    id: number
    bag_id: number
    sira_no: number
    faaliyet_adi: string
    kurum_ici?: boolean
  } | null
  if (!faaliyet) notFound()
  const kurumIci = Boolean(faaliyet.kurum_ici)
  const bagId = Number(faaliyet.bag_id)
  const { data: bag } = await sb
    .from('performans_programi_alt_program_hedef')
    .select('id, alt_hedef_id, faaliyet_id, alt_program_id')
    .eq('id', bagId)
    .maybeSingle()
  if (!bag) notFound()
  const { data: alt } = await sb
    .from('performans_programi_alt_program')
    .select('id, program_id')
    .eq('id', bag.alt_program_id)
    .maybeSingle()
  if (!alt) notFound()
  const { data: program } = await sb
    .from('performans_programi_program')
    .select('id, yil')
    .eq('id', alt.program_id)
    .maybeSingle()
  if (!program) notFound()
  const yil = Number(program.yil)
  const sec = await ppIliskiSecenekleri()
  const ph = sec.secenekler.find(s => s.id === Number(bag.alt_hedef_id))
  const fKod = ppFaaliyetKodu(ph?.kod ?? '', Number(faaliyet.sira_no))

  const { data: gRaw } = await sb
    .from('performans_programi_pf_gosterge')
    .select('id, sira_no, gosterge_adi')
    .eq('faaliyet_id', faaliyetId)
    .order('sira_no')
  const gostergeler = (gRaw ?? []) as { id: number; sira_no: number; gosterge_adi: string }[]
  const gIds = gostergeler.map(g => g.id)

  const odenekSorgu = gIds.length
    ? await sb
        .from('performans_programi_pf_odenek')
        .select('pf_gosterge_id, t1_butce, t1_haziran, t1_yil_sonu, t_butce, t1_tahmin, t2_tahmin')
        .in('pf_gosterge_id', gIds)
    : { data: [] as unknown[], error: null }

  const bos = (): PpMaliyetToplam => ({
    t1Butce: 0,
    t1Haziran: 0,
    t1YilSonu: 0,
    tButce: 0,
    t1Tahmin: 0,
    t2Tahmin: 0,
  })
  const maliyet = new Map<number, PpMaliyetToplam>()
  if (!odenekSorgu.error) {
    for (const r of odenekSorgu.data ?? []) {
      const satir = r as {
        pf_gosterge_id?: number
        t1_butce?: number | null
        t1_haziran?: number | null
        t1_yil_sonu?: number | null
        t_butce?: number | null
        t1_tahmin?: number | null
        t2_tahmin?: number | null
      }
      const id = Number(satir.pf_gosterge_id)
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

  const satirlar: PpPfGostergeListeSatir[] = gostergeler.map(g => ({
    id: g.id,
    sira: g.sira_no,
    kod: ppGostergeKodu(fKod, g.sira_no),
    ad: g.gosterge_adi,
    maliyet: maliyet.get(g.id) ?? bos(),
  }))

  return (
    <div className="space-y-4">
      <StratejikPlanBreadcrumb
        items={[
          { label: 'İşlemler', href: '/stratejik-yonetim/performans-programi/islemler' },
          { label: 'Programlar', href: `/stratejik-yonetim/performans-programi/islemler/${yil}` },
          { label: 'Alt Programlar', href: `/stratejik-yonetim/performans-programi/islemler/${yil}/${alt.program_id}` },
          {
            label: 'Faaliyetler',
            href: `/stratejik-yonetim/performans-programi/islemler/${yil}/${alt.program_id}/${bag.alt_program_id}/faaliyetler`,
          },
          {
            label: 'Alt Program Hedefleri',
            href: `/stratejik-yonetim/performans-programi/islemler/${yil}/${alt.program_id}/${bag.alt_program_id}/faaliyetler/${bag.faaliyet_id}`,
          },
          { label: 'Performans Faaliyetleri', href: `/stratejik-yonetim/performans-programi/hedef/${bagId}` },
          { label: 'Göstergeler' },
        ]}
      />
      {odenekSorgu.error ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Ödenek gösterge bağını için 20261124180000_pp_odenek_gosterge.sql dosyasını çalıştırın.
        </p>
      ) : null}
      <PpPfGostergeListeClient
        yil={yil}
        faaliyetId={faaliyetId}
        baslik={`${fKod} · ${faaliyet.faaliyet_adi}`}
        satirlar={satirlar}
        kurumIciBaslangic={kurumIci}
      />
    </div>
  )
}
