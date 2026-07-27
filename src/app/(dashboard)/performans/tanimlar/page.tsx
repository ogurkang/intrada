import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const KARTLAR = [
  {
    kod: 'KRT',
    href: '/performans/tanimlar/kriterler',
    baslik: 'Performans Kriterleri',
    aciklama: 'Ek-5 formundaki ortak ve role özel kriterler; aktif/pasif yönetimi.',
    renk: 'border-indigo-200 bg-indigo-50',
  },
  {
    kod: 'SMS',
    href: '/performans/tanimlar/sms',
    baslik: 'SMS Şablonu',
    aciklama: '2. amire gönderilen performans bildirim SMS metni.',
    renk: 'border-sky-200 bg-sky-50',
  },
  {
    kod: 'IMZ',
    href: '/performans/tanimlar/imzalar',
    baslik: 'Amir İmzaları',
    aciklama: '1. ve 2. amir imza görselleri — Ek-5 formlarında kullanılır.',
    renk: 'border-violet-200 bg-violet-50',
  },
] as const

export default async function PerformansTanimlarHubPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [{ count: kriterSay }, { count: imzaSay }, amirRes] = await Promise.all([
    db.from('performans_kriter').select('id', { count: 'exact', head: true }).eq('aktif', true),
    db.from('performans_amir_imza').select('sicil_no', { count: 'exact', head: true }),
    db.from('performans_degerlendirme').select('amir1_sicil, amir2_sicil'),
  ])

  const amirSet = new Set<string>()
  for (const r of amirRes.data ?? []) {
    if (r.amir1_sicil) amirSet.add(r.amir1_sicil)
    if (r.amir2_sicil) amirSet.add(r.amir2_sicil)
  }

  const sayilar: Record<string, string> = {
    KRT: `${kriterSay ?? 0} aktif kriter`,
    SMS: '1 şablon',
    IMZ: `${imzaSay ?? 0} / ${amirSet.size} amir imzalı`,
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/performans"
          className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2"
        >
          ← Performans Yönetimi
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">Tanımlar</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Performans modülü kriter, SMS ve imza tanımları.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {KARTLAR.map(k => (
          <Link
            key={k.href}
            href={k.href}
            className={`rounded-xl border p-5 ${k.renk} hover:shadow-md transition-shadow`}
          >
            <span className="text-xs font-bold tracking-widest opacity-60">{k.kod}</span>
            <h2 className="font-semibold text-slate-800 mt-0.5">{k.baslik}</h2>
            <p className="text-xs opacity-70 mt-2 mb-4 leading-relaxed">{k.aciklama}</p>
            <div className="flex items-center justify-between text-xs">
              <span className="opacity-70">{sayilar[k.kod]}</span>
              <span className="font-medium">Yönet →</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
