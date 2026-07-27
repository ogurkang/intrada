import Link from 'next/link'

export default function PerformansGuncelDonemYokMesaji({ yil }: { yil: number }) {
  return (
    <div className="max-w-xl mx-auto mt-10 rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
      <p className="text-lg font-semibold text-slate-900">Değerlendirme dönemi bulunamadı</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        {yil} yılı için performans değerlendirme dönemi henüz tanımlanmamış veya açılmamıştır.
        Dönem açıldığında bu menüden doğrudan değerlendirme ekranına yönlendirileceksiniz.
      </p>
      <p className="mt-6">
        <Link
          href="/performans"
          className="text-sm font-semibold text-indigo-700 underline underline-offset-2 hover:text-indigo-900"
        >
          Performans ana sayfasına dön
        </Link>
      </p>
    </div>
  )
}
