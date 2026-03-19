import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function BildirimHubPage() {
  const supabase = await createClient()

  const [
    { count: ogrenimSayisi },
    { count: aileSayisi },
    { count: malSayisi },
  ] = await Promise.all([
    supabase.from('calisan_ogrenim').select('*', { count: 'exact', head: true }),
    supabase.from('aile_bildirimi').select('*',  { count: 'exact', head: true }),
    supabase.from('mal_bildirimi').select('*',   { count: 'exact', head: true }),
  ])

  const kartlar = [
    {
      baslik:   'Öğrenim Bildirimi',
      aciklama: 'Personel öğrenim ve diploma kayıtları',
      href:     '/bildirim/ogrenim',
      sayi:     ogrenimSayisi ?? 0,
      birim:    'kayıt',
      renk:     'border-blue-200 bg-blue-50',
      ikonRenk: 'bg-blue-100 text-blue-600',
      ikon:     (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
        </svg>
      ),
    },
    {
      baslik:   'Aile Bildirimi',
      aciklama: 'Medeni hal, eş ve çocuk bilgileri',
      href:     '/bildirim/aile',
      sayi:     aileSayisi ?? 0,
      birim:    'kayıt',
      renk:     'border-green-200 bg-green-50',
      ikonRenk: 'bg-green-100 text-green-600',
      ikon:     (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      ),
    },
    {
      baslik:   'Mal Bildirimi',
      aciklama: 'Taşınmaz, taşıt, banka ve diğer servet bilgileri',
      href:     '/bildirim/mal',
      sayi:     malSayisi ?? 0,
      birim:    'beyan',
      renk:     'border-amber-200 bg-amber-50',
      ikonRenk: 'bg-amber-100 text-amber-600',
      ikon:     (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Bildirim Modülü</h1>
        <p className="text-sm text-slate-500 mt-1">Öğrenim, aile ve mal bildirimleri yönetimi</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {kartlar.map(k => (
          <Link key={k.href} href={k.href}
            className={`block rounded-xl border-2 ${k.renk} p-6 hover:shadow-md transition-all group`}>
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl ${k.ikonRenk}`}>{k.ikon}</div>
              <svg className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors mt-1"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-slate-800 tabular-nums">{k.sayi}</p>
            <p className="text-xs text-slate-500 mb-2">{k.birim}</p>
            <p className="font-semibold text-slate-700">{k.baslik}</p>
            <p className="text-sm text-slate-500 mt-0.5">{k.aciklama}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
