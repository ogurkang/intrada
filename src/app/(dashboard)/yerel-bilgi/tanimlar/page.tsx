import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const KARTLAR = [
  {
    kod: 'AST',
    href: '/yerel-bilgi/tanimlar/arac-sahiplik-durum',
    baslik: 'Araç Sahiplik Durumu Tanımı',
    aciklama: 'Araç sahiplik durumu kodları (ör. belediye, hizmet alımı).',
    tablo: 'yerel_bilgi_arac_sahiplik_durum' as const,
    renk: 'border-teal-200 bg-teal-50 text-teal-900',
  },
  {
    kod: 'ADT',
    href: '/yerel-bilgi/tanimlar/arac-durum',
    baslik: 'Araç Durum Tanımı',
    aciklama: 'Araç durum kodları (ör. müsait, serviste).',
    tablo: 'yerel_bilgi_arac_durum' as const,
    renk: 'border-sky-200 bg-sky-50 text-sky-900',
  },
  {
    kod: 'ATT',
    href: '/yerel-bilgi/tanimlar/arac-turu',
    baslik: 'Araç Türü — Alt Tür Tanımı',
    aciklama: 'Önce araç türünü ekleyin; türe tıklayarak alt türleri yönetin.',
    tablo: 'yerel_bilgi_arac_turu' as const,
    renk: 'border-violet-200 bg-violet-50 text-violet-900',
    altTurSay: true,
  },
  {
    kod: 'BGD',
    href: '/yerel-bilgi/tanimlar/butce-gider',
    baslik: 'Bütçe Gider Tanımı',
    aciklama: 'Gider kalemleri.',
    tablo: 'yerel_bilgi_butce_gider' as const,
    renk: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  },
  {
    kod: 'BGL',
    href: '/yerel-bilgi/tanimlar/butce-gelir',
    baslik: 'Bütçe Gelir Tanımı',
    aciklama: 'Gelir kalemleri.',
    tablo: 'yerel_bilgi_butce_gelir' as const,
    renk: 'border-orange-200 bg-orange-50 text-orange-900',
  },
] as const

type TabloBasit =
  | 'yerel_bilgi_arac_sahiplik_durum'
  | 'yerel_bilgi_arac_durum'
  | 'yerel_bilgi_arac_turu'
  | 'yerel_bilgi_butce_gider'
  | 'yerel_bilgi_butce_gelir'

async function sayimBasit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tablo: TabloBasit,
): Promise<{ toplam: number; aktif: number }> {
  const [{ count: aktif }, { count: toplam }] = await Promise.all([
    supabase.from(tablo).select('id', { count: 'exact', head: true }).eq('aktif', true),
    supabase.from(tablo).select('id', { count: 'exact', head: true }),
  ])
  return { aktif: aktif ?? 0, toplam: toplam ?? 0 }
}

export default async function YerelBilgiTanimlarHubPage() {
  const supabase = await createClient()

  const [ast, ad, atTuru, altTurRow, bgd, bgl] = await Promise.all([
    sayimBasit(supabase, 'yerel_bilgi_arac_sahiplik_durum'),
    sayimBasit(supabase, 'yerel_bilgi_arac_durum'),
    sayimBasit(supabase, 'yerel_bilgi_arac_turu'),
    supabase.from('yerel_bilgi_arac_alt_tur').select('id', { count: 'exact', head: true }),
    sayimBasit(supabase, 'yerel_bilgi_butce_gider'),
    sayimBasit(supabase, 'yerel_bilgi_butce_gelir'),
  ])

  const altTurToplam = altTurRow.count ?? 0

  const byTablo: Record<TabloBasit, { toplam: number; aktif: number }> = {
    yerel_bilgi_arac_sahiplik_durum: ast,
    yerel_bilgi_arac_durum: ad,
    yerel_bilgi_arac_turu: atTuru,
    yerel_bilgi_butce_gider: bgd,
    yerel_bilgi_butce_gelir: bgl,
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/yerel-bilgi"
          className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2"
        >
          ← Yerel Bilgi Yönetimi
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">Tanımlar</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Sıra no, tanım adı ve aktif/pasif; çoklu ekleme, satır ve toplu düzenleme her listede kullanılabilir.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {KARTLAR.map(k => {
          const s = byTablo[k.tablo]
          return (
            <Link
              key={k.href}
              href={k.href}
              className={`rounded-xl border p-5 ${k.renk} hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="min-w-0">
                  <span className="text-xs font-bold tracking-widest opacity-60">{k.kod}</span>
                  <h2 className="font-semibold text-slate-800 mt-0.5">{k.baslik}</h2>
                </div>
                {s.aktif > 0 && (
                  <span className="bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full shrink-0">
                    {s.aktif} aktif
                  </span>
                )}
              </div>
              <p className="text-xs opacity-70 mb-4 leading-relaxed">{k.aciklama}</p>
              <div className="flex items-center justify-between text-xs gap-2">
                <span className="opacity-70">
                  {'altTurSay' in k && k.altTurSay ? (
                    <>
                      Tür: <strong>{s.toplam}</strong>
                      {' · '}
                      Alt tür: <strong>{altTurToplam}</strong>
                    </>
                  ) : (
                    <>
                      Toplam: <strong>{s.toplam}</strong> tanım
                    </>
                  )}
                </span>
                <span className="font-medium shrink-0">Yönet →</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
