import Link from 'next/link'

const KARTLAR = [
  {
    href: '/hesaplama/tanimlar/kalemler',
    baslik: 'Kalemler',
    aciklama: 'Yevmiye ve sosyal hakların bugünkü taban tutarı, birimi ve hangi görev gruplarına yazılacağı.',
  },
  {
    href: '/hesaplama/tanimlar/gorev-gruplari',
    baslik: 'Görev grupları',
    aciklama: 'Pazarlık hesabındaki personel sayısı ve fiili gün.',
  },
  {
    href: '/hesaplama/tanimlar/yasal-oranlar',
    baslik: 'Yasal oranlar',
    aciklama: 'İşveren SGK ve işsizlik payı. Prime esas kalemlerin kurum maliyetine eklenir.',
  },
]

export default function HesaplamaTanimlarPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/hesaplama" className="text-sm text-slate-500 hover:text-slate-800">← Hesaplama Yönetimi</Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-800">Tanımlar</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Taban burada tutulur. Artış oranını Personel Maliyeti Hesaplama ekranında artı ve eksi ile değiştirirsiniz.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
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
