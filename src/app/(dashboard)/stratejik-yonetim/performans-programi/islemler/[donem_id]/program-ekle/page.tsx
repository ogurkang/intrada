import Link from 'next/link'
import StratejikPlanBreadcrumb from '@/components/stratejik/StratejikPlanBreadcrumb'
import { notFound } from 'next/navigation'

export default async function PerformansProgramiProgramEklePage({
  params,
}: {
  params: Promise<{ donem_id: string }>
}) {
  const p = await params
  const yil = Number.parseInt(p.donem_id, 10)
  if (!Number.isFinite(yil)) notFound()

  return (
    <div className="space-y-4">
      <StratejikPlanBreadcrumb
        items={[
          { label: 'İşlemler', href: '/stratejik-yonetim/performans-programi/islemler' },
          { label: `${yil} Yılı Performans Programı`, href: `/stratejik-yonetim/performans-programi/islemler/${yil}` },
          { label: 'Program Ekle' },
        ]}
      />
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
        <h1 className="text-2xl font-bold text-slate-800">Program Ekle</h1>
        <p className="text-sm text-slate-600">
          {yil} yılı için program ekleme formu bir sonraki adımda bu ekrana bağlanacaktır.
        </p>
        <div>
          <Link
            href={`/stratejik-yonetim/performans-programi/islemler/${yil}`}
            className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Döneme Geri Dön
          </Link>
        </div>
      </div>
    </div>
  )
}
