import { notFound } from 'next/navigation'
import Link from 'next/link'
import { yevmiyePuantajYukle } from './actions'
import YevmiyePuantajClient from '@/components/kesintiler/YevmiyePuantajClient'

interface Props {
  params: Promise<{ donem_id: string }>
}

export default async function YevmiyePuantajPage({ params }: Props) {
  const { donem_id: donemIdStr } = await params
  const donem_id = parseInt(donemIdStr, 10)
  if (isNaN(donem_id)) notFound()

  const { data, hata } = await yevmiyePuantajYukle(donem_id)
  if (hata || !data) notFound()

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/kesintiler/yevmiye" className="hover:text-slate-800 transition-colors">
          Yevmiye Puantajı
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-medium">
          {data.donem.donem_adi ?? `Dönem #${data.donem.id}`}
        </span>
        {data.donem.durum && (
          <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
            data.donem.durum === 'Açık' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
          }`}>
            {data.donem.durum}
          </span>
        )}
      </nav>

      <YevmiyePuantajClient data={data} donemId={donem_id} />
    </div>
  )
}
