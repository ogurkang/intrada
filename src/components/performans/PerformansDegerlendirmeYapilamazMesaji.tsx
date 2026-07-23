import Link from 'next/link'

export default function PerformansDegerlendirmeYapilamazMesaji() {
  return (
    <div className="max-w-xl mx-auto mt-10 rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
      <p className="text-lg font-semibold text-slate-900">Değerlendirme yapamazsınız.</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        Performans değerlendirmenize sayfanızda yer alan Performans Bilgileri sekmesinden ulaşabilirsiniz.
      </p>
      <p className="mt-6">
        <Link
          href="/performans/degerlendirme"
          className="text-sm font-semibold text-indigo-700 underline underline-offset-2 hover:text-indigo-900"
        >
          Dönem listesine dön
        </Link>
      </p>
    </div>
  )
}
