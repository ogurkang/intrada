import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import FirmaPersonelDuzenleClient from '@/components/personel/FirmaPersonelDuzenleClient'
import { firmaGuncelle } from '../../actions'
import { resolveFirmaCalisanSegmentToId } from '@/lib/firma-calisan-load'
import { firmaCalisanDetayHref } from '@/lib/firma-calisan-link'
import { sortOgrenimIsimListesi } from '@/lib/ogrenim-sira'
import type { Tables } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function FirmaPersonelDuzenlePage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id: rawSegment } = await params
  const supabase = await createClient()
  const idNum = await resolveFirmaCalisanSegmentToId(supabase, rawSegment)

  const { data: row, error } = await supabase
    .from('firma_calisanlar')
    .select('*')
    .eq('id', idNum)
    .single()

  if (error || !row) notFound()

  const [
    { data: kayitlar },
    { data: tanimMud },
    { data: tanimOgr },
    { data: fcAyrilis },
    { data: khAyrilis },
  ] = await Promise.all([
    supabase.from('firma_calisanlar').select('gorev_mudurlugu'),
    supabase.from('tanim_mudurluk').select('mudurluk_adi').order('mudurluk_adi'),
    supabase.from('tanim_ogrenim').select('isim').eq('aktif', true),
    supabase.from('firma_calisanlar').select('ayrilis_nedeni').not('ayrilis_nedeni', 'is', null),
    supabase.from('kadro_hareketleri').select('ayrilis_nedeni').not('ayrilis_nedeni', 'is', null),
  ])

  const tanimMudList = (tanimMud ?? []).map(m => m.mudurluk_adi)
  const fcMudList = (kayitlar ?? []).map(k => k.gorev_mudurlugu ?? '').filter(Boolean)
  const mevcutMud = (row as { gorev_mudurlugu?: string | null }).gorev_mudurlugu ?? ''
  const mudurluler = [...new Set([...tanimMudList, ...fcMudList, mevcutMud].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'))

  const ogrenimler = sortOgrenimIsimListesi((tanimOgr ?? []).map(o => o.isim))

  const ayrilisNedenleri = [...new Set([
    ...(fcAyrilis ?? []).map(r => r.ayrilis_nedeni).filter(Boolean),
    ...(khAyrilis ?? []).map(r => r.ayrilis_nedeni).filter(Boolean),
  ])].sort((a, b) => String(a).localeCompare(String(b), 'tr'))

  const k = row as Tables<'firma_calisanlar'>
  const detayHref = firmaCalisanDetayHref(k)

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/firma-calisanlar" className="hover:text-slate-800 transition-colors">
          Firma Personel
        </Link>
        <span className="text-slate-300">/</span>
        <Link href={detayHref} className="hover:text-slate-800 transition-colors">
          {k.ad_soyad}
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-medium">Düzenle</span>
      </nav>

      <FirmaPersonelDuzenleClient
        kayit={k}
        mudurluler={mudurluler}
        ogrenimler={ogrenimler}
        ayrilisNedenleri={ayrilisNedenleri as string[]}
        onGuncelle={firmaGuncelle}
      />
    </div>
  )
}
