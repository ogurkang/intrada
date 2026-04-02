import Link from 'next/link'
import { getAppAccess } from '@/lib/app-access'
import { createClient } from '@/lib/supabase/server'

export default async function RaporYonetimiPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Rapor Yönetimi</h1>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          Aşağıdaki raporlar yıllık ve aylık dönem sekmeleriyle sunulur; her raporda genel özet ve dönem bazlı
          detay bulunur.
        </p>
        {access.mode === 'kullanici' && (
          <p className="mt-3 text-xs text-slate-500">
            Erişim, yetkilendirme ekranındaki «Rapor Yönetimi» modül iznine bağlıdır.
          </p>
        )}
      </div>
      <ul className="space-y-2">
        <li>
          <Link
            href="/rapor/statuye-gore-cinsiyet"
            className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 hover:border-teal-300 hover:bg-teal-50/50 transition-colors"
          >
            Statüye Göre Cinsiyet Raporu
            <span className="block text-xs font-normal text-slate-500 mt-0.5">
              YILLIK ve Ocak–Aralık sekmeleri; kadın/erkek dağılımı ve gelen/ayrılan özetleri
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/rapor/konuma-gore-cinsiyet"
            className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 hover:border-teal-300 hover:bg-teal-50/50 transition-colors"
          >
            Konuma Göre Cinsiyet Raporu
            <span className="block text-xs font-normal text-slate-500 mt-0.5">
              Tanımlar {'>'} Müdürlük İç/Dış konumuna göre kadın/erkek; aynı sekme ve özet yapısı
            </span>
          </Link>
        </li>
      </ul>
    </div>
  )
}
