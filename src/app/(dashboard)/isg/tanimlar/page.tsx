import Link from 'next/link'

export default function IsgTanimlarPage() {
  return (
    <div>
      <div className="mb-6">
        <Link
          href="/isg"
          className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2"
        >
          ← İSG Yönetimi
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">İSG — Tanımlar</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          İş sağlığı ve güvenliği tanım ekranları bu bölüme eklenecektir.
        </p>
      </div>

      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
        Henüz tanımlı kayıt türü bulunmuyor.
      </div>
    </div>
  )
}
