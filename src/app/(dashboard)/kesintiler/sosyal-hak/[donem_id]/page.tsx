import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SosyalHakDetayClient from '@/components/kesintiler/SosyalHakDetayClient'

interface Props {
  params: Promise<{ donem_id: string }>
}

export default async function SosyalHakDetayPage({ params }: Props) {
  const { donem_id } = await params
  const id = parseInt(donem_id, 10)
  if (isNaN(id)) notFound()

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: donem } = await (supabase as any)
    .from('sosyal_hak_donem')
    .select('id, donem_adi, sira_no')
    .eq('id', id)
    .single()
  if (!donem) notFound()

  const donemLabel = donem.donem_adi ?? donem.sira_no ?? `Dönem #${id}`

  return (
    <div>
      <nav className="flex items-center justify-between gap-3 mb-6">
        <span className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/kesintiler/sosyal-hak" className="hover:text-slate-800 transition-colors">
            Sosyal Hak Kesintileri
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-800 font-medium">{donemLabel}</span>
        </span>
        <Link
          href="/kesintiler/sosyal-hak"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Listeye Dön
        </Link>
      </nav>

      <SosyalHakDetayClient donemId={id} />
    </div>
  )
}
