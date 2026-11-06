import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StratejikPlanBreadcrumb from '@/components/stratejik/StratejikPlanBreadcrumb'
import { ppParaYaz } from '@/lib/pp-iliski'

export const dynamic = 'force-dynamic'

const SUTUN = [
  ['t1_butce', 'bg-slate-500 text-white', -1, 'Bütçe'],
  ['t1_haziran', 'bg-slate-400 text-slate-900', -1, 'Haziran Sonu Harcama'],
  ['t1_yil_sonu', 'bg-slate-200 text-slate-800', -1, 'Yıl Sonu Tahmini Harcama'],
  ['t_butce', 'bg-emerald-100 text-slate-800', 0, 'Bütçe'],
  ['t1_tahmin', 'bg-orange-100 text-slate-800', 1, 'Tahmin'],
  ['t2_tahmin', 'bg-sky-100 text-slate-800', 2, 'Tahmin'],
] as const

type OdenekSatir = {
  butce_kodu_id: number
  t1_butce: number | null
  t1_haziran: number | null
  t1_yil_sonu: number | null
  t_butce: number | null
  t1_tahmin: number | null
  t2_tahmin: number | null
}

export default async function PpPfOdenekGorPage({
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
  const { data: odenekRaw, error } = await sb.from('performans_programi_pf_odenek').select('butce_kodu_id, t1_butce, t1_haziran, t1_yil_sonu, t_butce, t1_tahmin, t2_tahmin').eq('pf_faaliyet_id', faaliyetId)
  const kayitlar = ((odenekRaw ?? []) as OdenekSatir[]).filter(r => SUTUN.some(([alan]) => r[alan] != null))
  const kodIds = kayitlar.map(r => r.butce_kodu_id)
  const { data: kodRaw } = kodIds.length
    ? await sb.from('performans_programi_butce_kodu').select('id, ekonomik_kod, hesap_adi').in('id', kodIds)
    : { data: [] }
  const kod = new Map((kodRaw ?? []).map((k: { id: number; ekonomik_kod: string; hesap_adi: string }) => [k.id, k]))
  const satirlar = kayitlar
    .map(r => ({ ...r, kod: kod.get(r.butce_kodu_id) as { ekonomik_kod: string; hesap_adi: string } | undefined }))
    .sort((a, b) => String(a.kod?.ekonomik_kod ?? '').localeCompare(String(b.kod?.ekonomik_kod ?? ''), 'tr'))
  return (
    <div className="space-y-4">
      <StratejikPlanBreadcrumb items={[
        { label: 'İşlemler', href: '/stratejik-yonetim/performans-programi/islemler' },
        { label: 'Programlar', href: `/stratejik-yonetim/performans-programi/islemler/${yil}` },
        { label: 'Performans Faaliyetleri', href: `/stratejik-yonetim/performans-programi/hedef/${bagId}` },
        { label: 'Ödenek görüntüle' },
      ]} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{String(faaliyet.faaliyet_adi ?? 'Ödenek')}</h1>
          <p className="mt-1 text-sm text-slate-600">Girilen teklifler ödenek koduna göre.</p>
        </div>
        <Link href={`/stratejik-yonetim/performans-programi/pf/${faaliyetId}/odenek`} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white">Teklif gir</Link>
      </div>
      {error ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Ödenek tablosu için 20261106140000_pp_faaliyet_aciklama_odenek.sql dosyasını çalıştırın.</p> : null}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="bg-slate-100 px-3 py-2 text-left">Ekonomik kod</th>
              <th className="bg-slate-100 px-3 py-2 text-left">Hesap adı</th>
              {SUTUN.map(([alan, renk, kayma, ad]) => (
                <th key={alan} className={`px-2 py-2 text-right text-xs font-medium ${renk}`}>{yil + kayma} {ad}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {satirlar.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-500">Bu faaliyet için ödenek teklifi yok.</td></tr>
            ) : satirlar.map(r => (
              <tr key={r.butce_kodu_id}>
                <td className="px-3 py-2 font-mono text-xs">{r.kod?.ekonomik_kod ?? r.butce_kodu_id}</td>
                <td className="px-3 py-2">{r.kod?.hesap_adi ?? ''}</td>
                {SUTUN.map(([alan, renk]) => (
                  <td key={alan} className={`px-2 py-2 text-right text-xs tabular-nums ${renk}`}>{ppParaYaz(r[alan] == null ? null : Number(r[alan])) || '—'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
