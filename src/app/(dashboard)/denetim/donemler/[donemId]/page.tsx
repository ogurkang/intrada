import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DenetimBolumHubClient from '@/components/denetim/DenetimBolumHubClient'
import { denetimDonemBolumler, denetimTarihGoster } from '@/lib/denetim'

export default async function DenetimDonemDetayPage({
  params,
}: {
  params: Promise<{ donemId: string }>
}) {
  const donemId = Number.parseInt((await params).donemId, 10)
  if (!Number.isFinite(donemId) || donemId <= 0) notFound()

  const supabase = await createClient()
  const { data: donem } = await supabase.from('denetim_donem').select('*').eq('id', donemId).maybeSingle()
  if (!donem) notFound()

  const bolumler = denetimDonemBolumler(donemId)
  const kartlar = bolumler.map(b => ({
    href: b.href,
    label: b.label,
    aciklama: b.aciklama,
    ikon: b.ikon,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link
            href="/denetim/donemler"
            className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2"
          >
            ← Denetim Dönemleri
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
        aciklama="Bu dönem için standart denetim başlıkları."
        geriHref={`/denetim/donemler/${donemId}`}
        geriLabel=""
        kartlar={kartlar}
      />
    </div>
  )
}
