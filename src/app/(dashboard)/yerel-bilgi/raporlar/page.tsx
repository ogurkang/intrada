import Link from 'next/link'

const RAPORLAR = [
  {
    kod: 'YBD',
    href: '/yerel-bilgi/raporlar/yerel-bilgi-yas-dagilimi',
    baslik: 'Yerel Bilgi İçin Yaş Raporu',
    aciklama: 'Yaş dağılımı: 18-25, 26-35, 36-45, 46-55, 56-65, 65+',
    renk: 'border-teal-200 bg-teal-50 text-teal-900',
  },
  {
    kod: 'ABR',
    href: '/yerel-bilgi/raporlar/arac-bilgileri',
    baslik: 'Araç Bilgileri Raporu',
    aciklama: 'Yalnızca aktif araçlar; sahiplik, durum, tür ve müdürlük (salt okunur liste).',
    renk: 'border-violet-200 bg-violet-50 text-violet-900',
  },
  {
    kod: 'BTR',
    href: '/yerel-bilgi/raporlar/butce-tahminleri',
    baslik: 'Bütçe Tahminleri Raporu',
    aciklama: 'Cari yıl + 1 dönemi için müdürlük bütçe tahmin girişlerinin salt okunur özeti.',
    renk: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  },
  {
    kod: 'BGR',
    href: '/yerel-bilgi/raporlar/butce-gerceklesmeleri',
    baslik: 'Bütçe Gerçekleşmeleri Raporu',
    aciklama: 'Cari yıl dönemi için müdürlük bütçe gerçekleşme girişlerinin salt okunur özeti.',
    renk: 'border-orange-200 bg-orange-50 text-orange-900',
  },
] as const

export default function YerelBilgiRaporlarPage() {
  const geriBtn =
    'inline-flex items-center rounded-lg bg-slate-800 text-white text-sm px-4 py-2 font-medium hover:bg-slate-700 transition-colors'

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-800">Yerel Bilgi — Raporlar</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Aşağıdaki raporlar, Rapor Yönetimi altından bu modüle taşınmıştır.
          </p>
        </div>
        <Link href="/yerel-bilgi" className={`${geriBtn} shrink-0 self-start sm:self-center`}>
          ← Yerel Bilgi Yönetimi
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {RAPORLAR.map(r => (
          <Link
            key={r.href}
            href={r.href}
            className={`rounded-xl border p-5 ${r.renk} hover:shadow-md transition-shadow`}
          >
            <div className="flex items-start justify-between mb-3 gap-2">
              <div className="min-w-0">
                <span className="text-xs font-bold tracking-widest opacity-60">{r.kod}</span>
                <h2 className="font-semibold text-slate-800 mt-0.5 leading-snug">{r.baslik}</h2>
              </div>
            </div>
            <p className="text-xs opacity-80 mb-4 leading-relaxed">{r.aciklama}</p>
            <span className="text-xs font-medium opacity-90">Raporu aç →</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
