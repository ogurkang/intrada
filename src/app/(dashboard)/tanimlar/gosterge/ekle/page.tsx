import Link from 'next/link'
import GostergeEkleYeniSekmeClient from '@/components/tanimlar/GostergeEkleYeniSekmeClient'

export default function GostergeEklePage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link href="/tanimlar/gosterge" className="text-sm text-sky-600 hover:text-sky-800 font-medium">
          ← Gösterge tanımları listesi
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Gösterge Ekle</h1>
      <p className="text-sm text-slate-600 mb-6">
        Birden fazla satır ekleyebilirsiniz. Kaydettikten sonra liste sekmesinde yenileyerek görebilirsiniz.
      </p>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <GostergeEkleYeniSekmeClient />
      </div>
    </div>
  )
}
