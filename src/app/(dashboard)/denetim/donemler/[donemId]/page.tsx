import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DenetimBolumHubClient from '@/components/denetim/DenetimBolumHubClient'
import { denetimDonemBolumler, denetimTarihGoster, type DenetimMenuIkonAnahtar } from '@/lib/denetim'
import { denetimMenuAgaciKur } from '@/lib/denetim-menu'
import { isCurrentDisDenetci } from '@/lib/app-access'

export default async function DenetimDonemDetayPage({
  params,
}: {
  params: Promise<{ donemId: string }>
}) {
  const donemId = Number.parseInt((await params).donemId, 10)
  if (!Number.isFinite(donemId) || donemId <= 0) notFound()

  const supabase = await createClient()
  const [{ data: donem }, { data: menuler }] = await Promise.all([
    supabase.from('denetim_donem').select('*').eq('id', donemId).maybeSingle(),
    supabase.from('denetim_donem_menu').select('*').eq('donem_id', donemId).order('sira_no'),
  ])
  if (!donem) notFound()

  const saltOkunur = await isCurrentDisDenetci(supabase)
  const sistemMenuIdleri = new Set((menuler ?? []).filter(m => m.sistem_anahtari).map(m => m.id))

  const agac = denetimMenuAgaciKur(donemId, menuler ?? [])
  const kartlar = agac.length
    ? agac.map(b => ({
        href: b.href,
        label: b.label,
        aciklama: b.aciklama ?? undefined,
        ikon: b.ikon,
        menuId: b.id,
        sistem: sistemMenuIdleri.has(b.id),
      }))
    : denetimDonemBolumler(donemId).map(b => ({
        href: b.href,
        label: b.label,
        aciklama: b.aciklama,
        ikon: b.ikon as DenetimMenuIkonAnahtar | undefined,
      }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link
            href="/denetim"
            className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2"
          >
            ← Genel Bakış
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">{donem.donem_adi}</h1>
          <p className="text-sm text-slate-600 mt-1">
            {denetimTarihGoster(donem.baslangic_tarihi)} – {denetimTarihGoster(donem.bitis_tarihi)}
            <span
              className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                donem.durum === 'Açık' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {donem.durum === 'Açık' ? 'Aktif' : 'Pasif'}
            </span>
          </p>
        </div>
      </div>

      <DenetimBolumHubClient
        baslik="Dönem Menüleri"
        aciklama="Bu dönemin ana alt menüleri."
        geriHref={`/denetim/donemler/${donemId}`}
        geriLabel=""
        kartlar={kartlar}
        menuDuzenlenebilir={!saltOkunur && donem.durum === 'Açık'}
      />
    </div>
  )
}
