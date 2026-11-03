import Link from 'next/link'

export default function StratejikModulSayfasi({
  baslik,
  aciklama,
  kartlar,
}: {
  baslik: string
  aciklama: string
  kartlar: { href: string; baslik: string; aciklama: string }[]
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{baslik}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">{aciklama}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {kartlar.map(k => (
          <Link key={k.href} href={k.href} className="rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-400">
            <h2 className="text-lg font-semibold text-slate-800">{k.baslik}</h2>
            <p className="mt-2 text-sm text-slate-600">{k.aciklama}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
