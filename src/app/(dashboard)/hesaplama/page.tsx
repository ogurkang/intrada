import Link from 'next/link'

const KARTLAR = [
  {
    href: '/hesaplama/personel-maliyeti',
    baslik: 'Personel Maliyeti Hesaplama',
    aciklama: 'Yevmiye ve sosyal hakların artış oranını artı-eksi ile değiştirin. Toplam maliyetin ne kadar kaydığını görün.',
  },
  {
    href: '/hesaplama/memur-maas',
    baslik: 'Memur Maaş Hesaplama',
    aciklama: 'PP bütçe kodlarında 01–02 ödenekleri. Müdürlük ve unvana göre cari yıl tutarı; CY+1…CY+3 yüzde veya tutar ile zincirleme artış.',
  },
  {
    href: '/hesaplama/emeklilik-tazminati',
    baslik: 'Emeklilik Tazminatı Hesaplama',
    aciklama: '375 sayılı KHK m. 1 (D). Memurda gösterge 13.558, işçide 12.105. Kesinti yalnız damga vergisidir.',
  },
  {
    href: '/hesaplama/emekli-ikramiye-maas',
    baslik: '4/C İkramiye ve Maaş Hesaplama',
    aciklama:
      'SGK 4/C tarzı tahmini emekli ikramiyesi ve 5434 usulü maaş. Derece, kademe, ek gösterge ve katsayı dönemi ile hesaplanır. Bilgi amaçlıdır.',
  },
  {
    href: '/hesaplama/olum-yardimi',
    baslik: 'Ölüm Yardımı Hesaplama',
    aciklama: 'Vefat eden memurun varislerine ölüm yardımı. Tutar varis sayısına bölünür.',
  },
  {
    href: '/hesaplama/kisi-borcu',
    baslik: 'Kişi Borcu Hesaplama',
    aciklama: 'Ana tutar taksit sayısına bölünür. İlk taksit faizsizdir. Sonraki taksitlere kanuni veya temerrüt faizi eklenir.',
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
          Personel maliyeti, memur maaş, emeklilik tazminatı, 4/C ikramiye-maaş, memur ölüm yardımı ve kişi borcu
          hesapları.
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
