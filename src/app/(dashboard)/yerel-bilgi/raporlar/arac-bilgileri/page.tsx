import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AracBilgileriRaporuPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: mudurluklerRaw },
    { data: aracRaw, error: aracErr },
    { data: sahipliklerRaw },
    { data: durumlarRaw },
    { data: turlerRaw },
    { data: altTurlerRaw },
  ] = await Promise.all([
    supabase.from('tanim_mudurluk').select('id, mudurluk_adi').eq('aktif', true).order('mudurluk_adi'),
    supabase
      .from('yerel_bilgi_arac')
      .select('*')
      .eq('aktif', true)
      .order('sira_no', { ascending: true })
      .limit(500),
    supabase
      .from('yerel_bilgi_arac_sahiplik_durum')
      .select('id, tanim_adi')
      .eq('aktif', true)
      .order('sira_no', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true }),
    supabase
      .from('yerel_bilgi_arac_durum')
      .select('id, tanim_adi')
      .eq('aktif', true)
      .order('sira_no', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true }),
    supabase
      .from('yerel_bilgi_arac_turu')
      .select('id, tanim_adi')
      .eq('aktif', true)
      .order('sira_no', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true }),
    supabase
      .from('yerel_bilgi_arac_alt_tur')
      .select('id, arac_turu_id, tanim_adi')
      .eq('aktif', true)
      .order('sira_no', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true }),
  ])

  const sahiMap = new Map((sahipliklerRaw ?? []).map(r => [r.id, r.tanim_adi]))
  const durMap = new Map((durumlarRaw ?? []).map(r => [r.id, r.tanim_adi]))
  const turMap = new Map((turlerRaw ?? []).map(r => [r.id, r.tanim_adi]))
  const altMap = new Map((altTurlerRaw ?? []).map(r => [r.id, r.tanim_adi]))
  const mudMap = new Map((mudurluklerRaw ?? []).map(r => [r.id, r.mudurluk_adi]))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="max-w-4xl">
          <Link
            href="/yerel-bilgi/raporlar"
            className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2"
          >
            ← Yerel Bilgi — Raporlar
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Araç Bilgileri Raporu</h1>
          <p className="text-sm text-slate-600 mt-1">
            Yalnızca aktif araçlar; sahiplik, durum, tür ve müdürlük bazında salt okunur rapor.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/api/yerel-bilgi/raporlar/arac-bilgileri/excel"
            className="inline-flex items-center rounded-lg bg-emerald-700 text-white text-xs font-medium px-3 py-1.5 hover:bg-emerald-600 transition-colors"
          >
            Excel İndir ({(aracRaw ?? []).length})
          </Link>
        </div>
      </div>

      {aracErr && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          Veri yüklenirken hata: {aracErr.message}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-3 py-3 font-semibold text-slate-600 w-16 tabular-nums">Sıra</th>
                <th className="text-left px-3 py-3 font-semibold text-slate-600">Sahiplik</th>
                <th className="text-left px-3 py-3 font-semibold text-slate-600">Araç durumu</th>
                <th className="text-left px-3 py-3 font-semibold text-slate-600">Tür</th>
                <th className="text-left px-3 py-3 font-semibold text-slate-600">Alt tür</th>
                <th className="text-center px-3 py-3 font-semibold text-slate-600 w-24">Plaka</th>
                <th className="text-left px-3 py-3 font-semibold text-slate-600">Şasi</th>
                <th className="text-left px-3 py-3 font-semibold text-slate-600">Müdürlük</th>
                <th className="text-center px-3 py-3 font-semibold text-slate-600 w-28">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(aracRaw ?? []).length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400">
                    Henüz kayıt yok.
                  </td>
                </tr>
              ) : (
                (aracRaw ?? []).map(r => {
                  const plaka = (r.plaka_no ?? '').trim()
                  const row = r as typeof r & { sira_no?: number; aktif?: boolean }
                  const sira = typeof row.sira_no === 'number' ? row.sira_no : r.id
                  const aktif = row.aktif !== false
                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 text-slate-800 font-medium tabular-nums">{sira}</td>
                      <td className="px-3 py-2.5 text-slate-800">{sahiMap.get(r.sahiplik_durum_id) ?? '—'}</td>
                      <td className="px-3 py-2.5 text-slate-800">{durMap.get(r.arac_durum_id) ?? '—'}</td>
                      <td className="px-3 py-2.5 text-slate-800">{turMap.get(r.arac_turu_id) ?? '—'}</td>
                      <td className="px-3 py-2.5 text-slate-800">{altMap.get(r.arac_alt_tur_id) ?? '—'}</td>
                      <td className="px-3 py-2.5 text-center text-slate-800">
                        {plaka.length > 0 ? 'Var' : 'Yok'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">{(r.sasi_no ?? '').trim()}</td>
                      <td className="px-3 py-2.5 text-slate-700">{mudMap.get(r.mudurluk_id) ?? '—'}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className={
                            aktif
                              ? 'inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium px-2 py-0.5'
                              : 'inline-flex items-center rounded-full bg-slate-200 text-slate-700 text-xs font-medium px-2 py-0.5'
                          }
                        >
                          {aktif ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
