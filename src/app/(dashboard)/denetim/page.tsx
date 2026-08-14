import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function DenetimYonetimiPage() {
  const supabase = await createClient()
  const { data: donemler } = await supabase
    .from('denetim_donem')
    .select('id, donem_adi, durum, sira_no')
    .order('sira_no', { ascending: false })
    .limit(5)

  const acik = (donemler ?? []).find(d => d.durum === 'Açık')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Denetim Yönetimi</h1>
        <p className="text-sm text-slate-600 mt-1 max-w-3xl">
          Sayıştay ve benzeri denetimlere hazırlık için dönem oluşturun; her dönem içinde karar, mali,
          taşınmaz, performans ve iç kontrol menüleri standart olarak yer alır.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/denetim/donemler"
          className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-5 hover:shadow-md transition-shadow"
        >
          <h2 className="font-semibold text-slate-800">Denetim Dönemleri</h2>
          <p className="text-xs text-slate-600 mt-3 leading-relaxed">
            Dönem ekleyin, düzenleyin ve dönem detayına girerek standart menülere ulaşın.
          </p>
          {acik ? (
            <p className="text-xs text-emerald-800 mt-3">Aktif dönem: {acik.donem_adi}</p>
          ) : (
            <p className="text-xs text-slate-500 mt-3">Şu an açık dönem yok.</p>
          )}
          <span className="text-xs font-medium text-indigo-800 mt-4 inline-block">Aç →</span>
        </Link>
      </div>
    </div>
  )
}
