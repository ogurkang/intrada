import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import RmyDetayClient from '@/components/kesintiler/RmyDetayClient'

interface Props {
  params: Promise<{ donem_id: string }>
}

export default async function RmyDetayPage({ params }: Props) {
  const { donem_id } = await params
  const id = parseInt(donem_id, 10)
  if (isNaN(id)) notFound()

  const supabase = await createClient()
  const { data: donem } = await supabase
    .from('raporlu_memurlar_yeni_donem')
    .select('id, donem_adi, sira_no')
    .eq('id', id)
    .single()
  if (!donem) notFound()

  const donemLabel = donem.donem_adi ?? donem.sira_no ?? `Dönem #${id}`

  return (
    <div>
      <nav className="flex items-center justify-between gap-3 mb-6">
        <span className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/kesintiler/rmy" className="hover:text-slate-800 transition-colors">
            Raporlu Memurlar (RMY)
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-800 font-medium">{donemLabel}</span>
        </span>
        <Link
          href="/kesintiler/rmy"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Listeye Dön
        </Link>
      </nav>

      <RmyDetayClient donemId={id} />
    </div>
  )
}
