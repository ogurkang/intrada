import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function ButceTahminleriDonemListPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const yilEtiketi = new Date().getFullYear() + 1
  const donemAdi = `${yilEtiketi} Yılı Bütçe Tahminleri Tablosu`
  const girisHref = '/yerel-bilgi/islemler/butce-tahminleri/giris'

  const geriBtn =
    'inline-flex items-center rounded-lg bg-slate-800 text-white text-sm px-4 py-2 font-medium hover:bg-slate-700 transition-colors'

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-800">Bütçe Tahminleri</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Dönem satırına tıklayarak tahmin veri giriş ekranına gidin (personel listesinden detaya geçiş gibi).
          </p>
        </div>
        <Link href="/yerel-bilgi/islemler" className={`${geriBtn} shrink-0 self-start sm:self-center`}>
          ← Yerel Bilgi — İşlemler
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[14rem]">Dönem</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Açıklama</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-teal-50/60 transition-colors">
                <td className="p-0 border-b border-slate-100" colSpan={2}>
                  <Link
                    href={girisHref}
                    className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-2 sm:gap-4 items-center px-4 py-4 text-inherit no-underline hover:no-underline"
                  >
                    <span className="font-semibold text-slate-900">{donemAdi}</span>
                    <span className="text-slate-600 text-sm leading-relaxed">
                      Bütçe tahmin tutarları; sütun yılı cari yıl + 1 ({yilEtiketi}).
                    </span>
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
