import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StratejikPlanBreadcrumb from '@/components/stratejik/StratejikPlanBreadcrumb'
import PerformansProgramiFaaliyetAmacClient, {
  type PpBagliAmac,
} from '@/components/stratejik/PerformansProgramiFaaliyetAmacClient'
import { faaliyetAmacEkle } from '../../../../actions'

export default async function PerformansProgramiFaaliyetDetayPage({
  params,
}: {
  params: Promise<{ donem_id: string; program_id: string; alt_program_id: string; faaliyet_id: string }>
}) {
  const p = await params
  const yil = Number.parseInt(p.donem_id, 10)
  const programId = Number.parseInt(p.program_id, 10)
  const altProgramId = Number.parseInt(p.alt_program_id, 10)
  const faaliyetId = Number.parseInt(p.faaliyet_id, 10)
  if (!Number.isFinite(yil) || !Number.isFinite(programId) || !Number.isFinite(altProgramId) || !Number.isFinite(faaliyetId)) notFound()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const [{ data: faaliyet }, { data: amacSecRaw }, { data: bagRaw }] = await Promise.all([
    sb.from('performans_programi_faaliyet').select('id, alt_program_id, faaliyet_adi').eq('id', faaliyetId).eq('alt_program_id', altProgramId).maybeSingle(),
    sb.from('stratejik_plan_amac').select('id, amac_adi, stratejik_plan_donem!inner(id, baslangic_tarihi, bitis_tarihi)').order('sira_no', { ascending: true, nullsFirst: false }).order('id', { ascending: true }),
    sb.from('performans_programi_faaliyet_amac').select('id, amac_id').eq('faaliyet_id', faaliyetId).order('id', { ascending: true }),
  ])
  if (!faaliyet) notFound()
  const amacSecenekleri = (amacSecRaw ?? [])
    .map((r: { id?: number; amac_adi?: string; stratejik_plan_donem?: { baslangic_tarihi?: string; bitis_tarihi?: string }[] | { baslangic_tarihi?: string; bitis_tarihi?: string } }) => {
      const d = Array.isArray(r.stratejik_plan_donem) ? r.stratejik_plan_donem[0] : r.stratejik_plan_donem
      const by = Number.parseInt(String(d?.baslangic_tarihi ?? '').slice(0, 4), 10)
      const sy = Number.parseInt(String(d?.bitis_tarihi ?? '').slice(0, 4), 10)
      if (!Number.isFinite(by) || !Number.isFinite(sy) || yil < by || yil > sy) return null
      return { id: Number(r.id), amac_adi: String(r.amac_adi ?? '') }
    })
    .filter(Boolean) as { id: number; amac_adi: string }[]
  const bagAmacIds = (bagRaw ?? []).map((b: { amac_id?: number }) => Number(b.amac_id)).filter(Number.isFinite)
  const { data: amacDetayRaw } = bagAmacIds.length ? await sb.from('stratejik_plan_amac').select('id, amac_adi').in('id', bagAmacIds) : { data: [] }
  const { data: hedefRaw } = bagAmacIds.length ? await sb.from('stratejik_plan_hedef').select('id, amac_id').in('amac_id', bagAmacIds) : { data: [] }
  const hedefIds = (hedefRaw ?? []).map((h: { id?: number }) => Number(h.id)).filter(Number.isFinite)
  const { data: altRaw } = hedefIds.length ? await sb.from('stratejik_plan_alt_hedef').select('id, hedef_id').in('hedef_id', hedefIds) : { data: [] }
  const altIds = (altRaw ?? []).map((a: { id?: number }) => Number(a.id)).filter(Number.isFinite)
  const { data: faRaw } = altIds.length ? await sb.from('stratejik_plan_faaliyet').select('id, alt_hedef_id').in('alt_hedef_id', altIds) : { data: [] }
  const { data: gosRaw } = altIds.length ? await sb.from('stratejik_plan_gosterge').select('id, alt_hedef_id').in('alt_hedef_id', altIds) : { data: [] }
  const hedefByAmac = new Map<number, number>()
  for (const h of hedefRaw ?? []) {
    const a = Number((h as { amac_id?: unknown }).amac_id); if (!Number.isFinite(a)) continue
    hedefByAmac.set(a, (hedefByAmac.get(a) ?? 0) + 1)
  }
  const altByAmac = new Map<number, number>()
  const hedefToAmac = new Map<number, number>((hedefRaw ?? []).map((h: { id?: number; amac_id?: number }) => [Number(h.id), Number(h.amac_id)]))
  for (const a of altRaw ?? []) {
    const amac = hedefToAmac.get(Number((a as { hedef_id?: number }).hedef_id)); if (!Number.isFinite(amac)) continue
    altByAmac.set(amac as number, (altByAmac.get(amac as number) ?? 0) + 1)
  }
  const faaliyetByAmac = new Map<number, number>()
  const gostergeByAmac = new Map<number, number>()
  const altToAmac = new Map<number, number>()
  for (const a of altRaw ?? []) {
    const hid = Number((a as { hedef_id?: number }).hedef_id)
    const aid = hedefToAmac.get(hid)
    if (Number.isFinite(aid)) altToAmac.set(Number((a as { id?: number }).id), aid as number)
  }
  for (const f of faRaw ?? []) {
    const aid = altToAmac.get(Number((f as { alt_hedef_id?: number }).alt_hedef_id)); if (!Number.isFinite(aid)) continue
    faaliyetByAmac.set(aid as number, (faaliyetByAmac.get(aid as number) ?? 0) + 1)
  }
  for (const g of gosRaw ?? []) {
    const aid = altToAmac.get(Number((g as { alt_hedef_id?: number }).alt_hedef_id)); if (!Number.isFinite(aid)) continue
    gostergeByAmac.set(aid as number, (gostergeByAmac.get(aid as number) ?? 0) + 1)
  }
  const amacById = new Map<number, string>((amacDetayRaw ?? []).map((a: { id?: number; amac_adi?: string }) => [Number(a.id), String(a.amac_adi ?? '')]))
  const bagliAmaclar: PpBagliAmac[] = (bagRaw ?? []).map((b: { id?: number; amac_id?: number }) => {
    const amacId = Number(b.amac_id)
    return {
      id: Number(b.id),
      amac_id: amacId,
      amac_adi: amacById.get(amacId) ?? `Amaç #${amacId}`,
      hedef_sayisi: hedefByAmac.get(amacId) ?? 0,
      alt_hedef_sayisi: altByAmac.get(amacId) ?? 0,
      faaliyet_sayisi: faaliyetByAmac.get(amacId) ?? 0,
      gosterge_sayisi: gostergeByAmac.get(amacId) ?? 0,
    }
  })
  return (
    <div className="space-y-4">
      <StratejikPlanBreadcrumb items={[
        { label: 'İşlemler', href: '/stratejik-yonetim/performans-programi/islemler' },
        { label: 'Programlar', href: `/stratejik-yonetim/performans-programi/islemler/${yil}` },
        { label: 'Alt Programlar', href: `/stratejik-yonetim/performans-programi/islemler/${yil}/${programId}` },
        { label: 'Faaliyetler', href: `/stratejik-yonetim/performans-programi/islemler/${yil}/${programId}/${altProgramId}` },
        { label: 'Amaçlar' },
      ]} />
      <PerformansProgramiFaaliyetAmacClient yil={yil} programId={programId} altProgramId={altProgramId} faaliyetId={faaliyetId} faaliyetAdi={String((faaliyet as { faaliyet_adi?: string }).faaliyet_adi ?? `Faaliyet #${faaliyetId}`)} amacSecenekleri={amacSecenekleri} bagliAmaclar={bagliAmaclar} onEkle={faaliyetAmacEkle} />
    </div>
  )
}
