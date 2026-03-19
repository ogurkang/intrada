import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import KadroDetayClient from '@/components/kadro/KadroDetayClient'
import { kadroGuncelle } from '../actions'
import type { Tables } from '@/types/database'

function tarihFmt(t: string | null) {
  if (!t) return '—'
  return new Date(t).toLocaleDateString('tr-TR')
}

export default async function KadroDetayPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const idNum = parseInt(id, 10)
  if (Number.isNaN(idNum)) notFound()

  const [
    { data: k, error },
    { data: kadroRaw },
    { data: calisanRaw },
    { data: statuRaw },
    { data: mudurRaw },
    { data: unvanRaw },
  ] = await Promise.all([
    supabase.from('kadro_hareketleri').select('*').eq('id', idNum).single(),
    supabase.from('kadro_hareketleri').select('gelis_nedeni, ayrilis_nedeni'),
    supabase.from('calisan').select('sicil_no, ad_soyad').order('ad_soyad'),
    supabase.from('tanim_statu').select('statu_adi').eq('aktif', true).order('statu_adi'),
    supabase.from('tanim_mudurluk').select('mudurluk_adi').eq('aktif', true).order('mudurluk_adi'),
    supabase.from('tanim_unvan').select('id, unvan_adi').eq('aktif', true).order('sira_no').order('unvan_adi'),
  ])

  if (error || !k) notFound()
  const row = k as Tables<'kadro_hareketleri'>
  const adMap: Record<string, string> = {}
  ;(calisanRaw ?? []).forEach((p: { sicil_no: string; ad_soyad: string }) => { adMap[p.sicil_no] = p.ad_soyad })

  const gelisNedenleri = [...new Set((kadroRaw ?? []).map((r: { gelis_nedeni: string | null }) => r.gelis_nedeni).filter(Boolean))] as string[]
  gelisNedenleri.sort((a, b) => (a ?? '').localeCompare(b ?? '', 'tr'))
  const ayrilisNedenleri = [...new Set((kadroRaw ?? []).map((r: { ayrilis_nedeni: string | null }) => r.ayrilis_nedeni).filter(Boolean))] as string[]
  ayrilisNedenleri.sort((a, b) => (a ?? '').localeCompare(b ?? '', 'tr'))

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/kadro" className="hover:text-slate-800 transition-colors">
          Kadro Hareketleri
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-medium">{row.kadro_unvani ?? row.kadro_sira_no ?? `#${id}`}</span>
      </nav>

      <KadroDetayClient
        row={row}
        adMap={adMap}
        personeller={(calisanRaw ?? []) as { sicil_no: string; ad_soyad: string }[]}
        statuler={(statuRaw ?? []).map((s: { statu_adi: string }) => s.statu_adi)}
        mudurluler={(mudurRaw ?? []).map((m: { mudurluk_adi: string }) => m.mudurluk_adi)}
        unvanlar={(unvanRaw ?? []).map((u: { id: number; unvan_adi: string }) => ({ id: u.id, unvan_adi: u.unvan_adi }))}
        gelisNedenleri={gelisNedenleri}
        ayrilisNedenleri={ayrilisNedenleri}
        onGuncelle={kadroGuncelle}
      />
    </div>
  )
}
