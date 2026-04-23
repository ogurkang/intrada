import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StratejikPlanGostergeYeniClient from '@/components/stratejik/StratejikPlanGostergeYeniClient'
import { gostergeEkle, gostergeTopluEkle } from '../../../../../actions'

export default async function StratejikPlanGostergeYeniPage({
  params,
}: {
  params: Promise<{ donem_id: string; amac_id: string; hedef_id: string; alt_hedef_id: string }>
}) {
  const p = await params
  const donemId = Number.parseInt(p.donem_id, 10)
  const amacId = Number.parseInt(p.amac_id, 10)
  const hedefId = Number.parseInt(p.hedef_id, 10)
  const altHedefId = Number.parseInt(p.alt_hedef_id, 10)
  if (!Number.isFinite(donemId) || !Number.isFinite(amacId) || !Number.isFinite(hedefId) || !Number.isFinite(altHedefId)) notFound()

  const supabase = await createClient()
  const [{ data: alt }, { data: donem }] = await Promise.all([
    supabase
      .from('stratejik_plan_alt_hedef' as never)
      .select('id, hedef_id, alt_hedef_adi')
      .eq('id', altHedefId)
      .eq('hedef_id', hedefId)
      .maybeSingle(),
    supabase
      .from('stratejik_plan_donem' as never)
      .select('baslangic_tarihi')
      .eq('id', donemId)
      .maybeSingle(),
  ])

  if (!alt || !donem) notFound()
  const baslangicYil = Number(String((donem as { baslangic_tarihi?: string }).baslangic_tarihi ?? '').slice(0, 4))
  const yillar = Number.isFinite(baslangicYil) ? [0, 1, 2, 3, 4].map(i => baslangicYil + i) : []

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Yeni Gösterge Ekle</h1>
        <Link href={`/stratejik-yonetim/stratejik-plan/islemler/${donemId}/${amacId}/${hedefId}/${altHedefId}`} className="flex items-center gap-2 border border-slate-300 text-slate-700 text-sm px-4 py-2 rounded-lg hover:bg-slate-50">
          ← Listeye Dön
        </Link>
      </div>
      <StratejikPlanGostergeYeniClient
        donemId={donemId}
        altHedefId={altHedefId}
        yillar={yillar}
        onEkle={gostergeEkle}
        onTopluEkle={gostergeTopluEkle}
      />
    </div>
  )
}

