import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { getKullaniciGorevMudurlukleri } from '@/lib/kullanici-mudurluk'
import StratejikPlanBreadcrumb from '@/components/stratejik/StratejikPlanBreadcrumb'

function normMud(v: string | null | undefined): string {
  return String(v ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR')
}

export default async function PerformansProgramiVeriGirisPage({
  params,
}: {
  params: Promise<{ donem_id: string }>
}) {
  const p = await params
  const yil = Number.parseInt(p.donem_id, 10)
  if (!Number.isFinite(yil)) notFound()

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()
  const access = await getAppAccess(supabase, user.id)
  if (access.mode === 'blocked') notFound()
  const adminLike = isAdminLike(access)
  const km = access.mode === 'kullanici' ? await getKullaniciGorevMudurlukleri(supabase, access.sicilNo) : { mudurlukler: [] }
  const izinMudSet = new Set((adminLike ? [] : km.mudurlukler).map(normMud))

  const { data: programRaw } = await sb.from('performans_programi_program').select('id').eq('yil', yil)
  const programIds = (programRaw ?? []).map((r: { id?: number }) => Number(r.id)).filter(Number.isFinite)
  const { data: altRaw } = programIds.length ? await sb.from('performans_programi_alt_program').select('id, program_id').in('program_id', programIds) : { data: [] }
  const altIds = (altRaw ?? []).map((r: { id?: number }) => Number(r.id)).filter(Number.isFinite)
  const { data: ppFaaliyetRaw } = altIds.length ? await sb.from('performans_programi_faaliyet').select('id').in('alt_program_id', altIds) : { data: [] }
  const ppFaaliyetIds = (ppFaaliyetRaw ?? []).map((r: { id?: number }) => Number(r.id)).filter(Number.isFinite)
  const { data: bagRaw } = ppFaaliyetIds.length ? await sb.from('performans_programi_faaliyet_amac').select('amac_id').in('faaliyet_id', ppFaaliyetIds) : { data: [] }
  const amacIds = [...new Set((bagRaw ?? []).map((r: { amac_id?: number }) => Number(r.amac_id)).filter(Number.isFinite))]

  const { data: hedefRaw } = amacIds.length ? await sb.from('stratejik_plan_hedef').select('id, amac_id').in('amac_id', amacIds) : { data: [] }
  const hedefIds = (hedefRaw ?? []).map((r: { id?: number }) => Number(r.id)).filter(Number.isFinite)
  const { data: altHedefRaw } = hedefIds.length ? await sb.from('stratejik_plan_alt_hedef').select('id, hedef_id, mudurluk').in('hedef_id', hedefIds) : { data: [] }
  const altHedefler = (altHedefRaw ?? []).filter((a: { mudurluk?: string }) => adminLike || izinMudSet.has(normMud(a.mudurluk)))
  const altHedefIds = altHedefler.map((a: { id?: number }) => Number(a.id)).filter(Number.isFinite)

  const { data: faaliyetRaw } = altHedefIds.length
    ? await sb
      .from('stratejik_plan_faaliyet')
      .select('id, alt_hedef_id, sira_no, faaliyet_adi')
      .in('alt_hedef_id', altHedefIds)
      .order('sira_no', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true })
    : { data: [] }
  const faaliyetIds = (faaliyetRaw ?? []).map((f: { id?: number }) => Number(f.id)).filter(Number.isFinite)
  const { data: gostergeRaw } = faaliyetIds.length ? await sb.from('stratejik_plan_gosterge').select('id, faaliyet_id').in('faaliyet_id', faaliyetIds) : { data: [] }
  const gostergeByFaaliyet = new Map<number, number>()
  for (const g of gostergeRaw ?? []) {
    const fid = Number((g as { faaliyet_id?: unknown }).faaliyet_id)
    if (!Number.isFinite(fid)) continue
    gostergeByFaaliyet.set(fid, (gostergeByFaaliyet.get(fid) ?? 0) + 1)
  }

  const altById = new Map<number, { mudurluk: string }>(
    altHedefler.map((a: { id?: number; mudurluk?: string }) => [Number(a.id), { mudurluk: String(a.mudurluk ?? '') }]),
  )

  type VeriGirisFaaliyetSatir = {
    id: number
    sira_no: number | null
    faaliyet_adi: string
    mudurluk: string
    gosterge_sayisi: number
  }
  const satirlar: VeriGirisFaaliyetSatir[] = (faaliyetRaw ?? []).map((f: { id?: number; sira_no?: number; faaliyet_adi?: string; alt_hedef_id?: number }) => ({
    id: Number(f.id),
    sira_no: Number.isFinite(Number(f.sira_no)) ? Number(f.sira_no) : null,
    faaliyet_adi: String(f.faaliyet_adi ?? ''),
    mudurluk: altById.get(Number(f.alt_hedef_id))?.mudurluk ?? '—',
    gosterge_sayisi: gostergeByFaaliyet.get(Number(f.id)) ?? 0,
  }))

  const { data: maliyetRaw } = faaliyetIds.length
    ? await sb
      .from('performans_programi_faaliyet_butce')
      .select('faaliyet_id, mudurluk, tutar, sonraki_yil_butce_1')
      .eq('yil', yil)
      .in('faaliyet_id', faaliyetIds)
    : { data: [] }
  const maliyetByFaaliyet = new Map<number, number>()
  for (const m of maliyetRaw ?? []) {
    const fid = Number((m as { faaliyet_id?: number }).faaliyet_id)
    const mud = String((m as { mudurluk?: string }).mudurluk ?? '')
    if (!Number.isFinite(fid)) continue
    const satirMud = satirlar.find((s: VeriGirisFaaliyetSatir) => s.id === fid)?.mudurluk ?? ''
    if (normMud(mud) !== normMud(satirMud)) continue
    const t = Number((m as { sonraki_yil_butce_1?: number; tutar?: number }).sonraki_yil_butce_1 ?? (m as { tutar?: number }).tutar ?? 0)
    maliyetByFaaliyet.set(fid, (maliyetByFaaliyet.get(fid) ?? 0) + (Number.isFinite(t) ? t : 0))
  }

  return (
    <div className="space-y-4">
      <StratejikPlanBreadcrumb
        items={[
          { label: 'İşlemler', href: '/stratejik-yonetim/performans-programi/islemler' },
          { label: `${yil} Veri Giriş` },
        ]}
      />
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Performans Programı Veri Girişi</h1>
          <p className="text-sm text-slate-500 mt-1">Görev müdürlüğünüz ile ilişkili stratejik plan faaliyetleri listelenir.</p>
        </div>
        <Link
          href={`/stratejik-yonetim/performans-programi/islemler/${yil}`}
          className="intrada-btn intrada-btn-ekle"
        >
          Faaliyet Ekle
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[920px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-center w-20">Sıra No</th>
                <th className="px-4 py-3 text-left">Faaliyet Adı</th>
                <th className="px-4 py-3 text-left w-64">Müdürlük</th>
                <th className="px-4 py-3 text-right w-40">Faaliyet Maliyeti</th>
                <th className="px-4 py-3 text-center w-32">Gösterge</th>
                <th className="px-4 py-3 text-center w-28">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {satirlar.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    Bu yıl için müdürlüğünüzle ilişkili faaliyet bulunamadı.
                  </td>
                </tr>
              ) : (
                satirlar.map((r, i) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-center text-slate-600">{r.sira_no ?? i + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{r.faaliyet_adi}</td>
                    <td className="px-4 py-3 text-slate-600">{r.mudurluk}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {(maliyetByFaaliyet.get(r.id) ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-700">{r.gosterge_sayisi}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center">
                        <Link
                          href={`/stratejik-yonetim/performans-programi/islemler/${yil}/veri-giris/${r.id}`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-indigo-600 hover:bg-indigo-50"
                          title="Detay"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
