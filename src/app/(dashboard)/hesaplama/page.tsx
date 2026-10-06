import Link from 'next/link'

const KARTLAR = [
  {
    href: '/hesaplama/personel-maliyeti',
    baslik: 'Personel Maliyeti Hesaplama',
    aciklama: 'Yevmiye ve sosyal hakların artış oranını artı-eksi ile değiştirin. Toplam maliyetin ne kadar kaydığını görün.',
  },
  {
    href: '/hesaplama/tanimlar',
    baslik: 'Tanımlar',
    aciklama: 'Kalem tabanları, görev grupları ve işveren oranları. Hesaplamanın dayandığı sabitler.',
  },
]

export default function HesaplamaYonetimiPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Hesaplama Yönetimi</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          ADABEL personelinin sendika pazarlığında kullanılacak maliyet senaryosu. Memur hesabı ve bordro belgesi bu modülde yer almaz.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {KARTLAR.map(k => (
          <Link key={k.href} href={k.href} className="rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-400">
            <h2 className="text-lg font-semibold text-slate-800">{k.baslik}</h2>
            <p className="mt-2 text-sm text-slate-600">{k.aciklama}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
