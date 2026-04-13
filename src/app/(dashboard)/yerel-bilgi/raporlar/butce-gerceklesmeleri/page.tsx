import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess } from '@/lib/app-access'
import { mudurlukIdFromAuthSession } from '@/lib/kadro-mudurluk-id'

function fmt(n: number | null) {
  if (n == null || !Number.isFinite(Number(n))) return '0,00'
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n))
}

export default async function ButceGerceklesmeleriRaporPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const access = await getAppAccess(supabase, user.id)
  const mudId = await mudurlukIdFromAuthSession(supabase, user.id, access)
  const yil = new Date().getFullYear()

  const [{ data: giderDefs }, { data: gelirDefs }, { data: islemRaw }, { data: mudRow }] = await Promise.all([
    supabase.from('yerel_bilgi_butce_gider').select('id, sira_no, tanim_adi').eq('aktif', true).order('sira_no', { ascending: true, nullsFirst: false }).order('id', { ascending: true }),
    supabase.from('yerel_bilgi_butce_gelir').select('id, sira_no, tanim_adi').eq('aktif', true).order('sira_no', { ascending: true, nullsFirst: false }).order('id', { ascending: true }),
    mudId != null ? supabase.from('yerel_bilgi_butce_gider_islem').select('*').eq('mudurluk_id', mudId) : Promise.resolve({ data: [] }),
    mudId != null ? supabase.from('tanim_mudurluk').select('mudurluk_adi').eq('id', mudId).maybeSingle() : Promise.resolve({ data: null }),
  ])

  const giderMap = new Map<number, number | null>()
  const gelirMap = new Map<number, number | null>()
  for (const r of islemRaw ?? []) {
    const row = r as { butce_gider_kalem_id?: number | null; butce_gelir_kalem_id?: number | null; tutar?: number | null }
    if (row.butce_gider_kalem_id != null) giderMap.set(row.butce_gider_kalem_id, row.tutar ?? null)
    if (row.butce_gelir_kalem_id != null) gelirMap.set(row.butce_gelir_kalem_id, row.tutar ?? null)
  }

  const btn = 'inline-flex items-center rounded-lg bg-slate-800 text-white text-sm px-4 py-2 font-medium hover:bg-slate-700 transition-colors'
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{yil} Yılı Bütçe Gerçekleşmeleri Raporu</h1>
          <p className="text-sm text-slate-500 mt-1">Müdürlük: {mudRow?.mudurluk_adi ?? 'Tanımsız'}</p>
        </div>
        <div className="flex gap-2 justify-end">
          <Link href="/api/yerel-bilgi/raporlar/butce-gerceklesmeleri/excel" className={btn}>Excel İndir</Link>
          <Link href="/yerel-bilgi/raporlar" className={btn}>← Yerel Bilgi — Raporlar</Link>
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b font-semibold text-slate-700">Bütçe Gider Türü (Gerçekleşme)</div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {(giderDefs ?? []).map(k => <tr key={k.id}><td className="px-4 py-2">{k.tanim_adi}</td><td className="px-4 py-2 text-right tabular-nums">{fmt(giderMap.get(k.id) ?? null)}</td></tr>)}
            </tbody>
          </table>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b font-semibold text-slate-700">Bütçe Gelir Türü (Gerçekleşme)</div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {(gelirDefs ?? []).map(k => <tr key={k.id}><td className="px-4 py-2">{k.tanim_adi}</td><td className="px-4 py-2 text-right tabular-nums">{fmt(gelirMap.get(k.id) ?? null)}</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
