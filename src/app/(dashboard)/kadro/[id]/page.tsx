import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import KadroDetayClient from '@/components/kadro/KadroDetayClient'
import { kadroGuncelle } from '../actions'
import { loadKadroDetayPageData, resolveKadroRouteSegment } from '@/lib/kadro-detay-load'
import type { Tables } from '@/types/database'

export default async function KadroDetayPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id: raw } = await params
  const supabase = await createClient()

  const resolved = await resolveKadroRouteSegment(supabase, raw)
  if ('redirect' in resolved) redirect(resolved.redirect)

  const detail = await loadKadroDetayPageData(supabase, resolved.idNum)
  if (!detail) notFound()

  const { row, ...rest } = detail
  const r = row as Tables<'kadro_hareketleri'>

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/kadro" className="hover:text-slate-800 transition-colors">
          Kadro Hareketleri
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-medium">{r.kadro_unvani ?? r.kadro_sira_no ?? `#${r.id}`}</span>
      </nav>

      <KadroDetayClient
        row={r}
        adMap={rest.adMap}
        personeller={rest.personeller}
        statuler={rest.statuler}
        mudurluler={rest.mudurluler}
        unvanlar={rest.unvanlar}
        gelisNedenleri={rest.gelisNedenleri}
        ayrilisNedenleri={rest.ayrilisNedenleri}
        onGuncelle={kadroGuncelle}
        auditLoglar={rest.auditLoglar}
      />
    </div>
  )
}
