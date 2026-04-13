import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AracAltTurTanimClient from './AracAltTurTanimClient'

export default async function AracAltTurTanimPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = await params
  const turId = Number(raw)
  if (!Number.isFinite(turId) || turId <= 0) notFound()

  const supabase = await createClient()
  const { data: tur, error: turErr } = await supabase
    .from('yerel_bilgi_arac_turu')
    .select('id, tanim_adi')
    .eq('id', turId)
    .maybeSingle()

  if (turErr || !tur) notFound()

  const { data, error } = await supabase
    .from('yerel_bilgi_arac_alt_tur')
    .select('id, sira_no, tanim_adi, aktif')
    .eq('arac_turu_id', turId)
    .order('sira_no', { ascending: true, nullsFirst: false })
    .order('id', { ascending: true })

  const rows = (data ?? []).map(r => ({
    id: r.id,
    sira_no: r.sira_no,
    tanim_adi: r.tanim_adi,
    aktif: r.aktif,
  }))

  return (
    <>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          Veri yüklenirken hata: {error.message}
        </div>
      )}
      <AracAltTurTanimClient turId={turId} turAdi={tur.tanim_adi} rows={rows} />
    </>
  )
}
