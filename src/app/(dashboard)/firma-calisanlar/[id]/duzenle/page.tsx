import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import FirmaPersonelDuzenleClient from '@/components/personel/FirmaPersonelDuzenleClient'
import { firmaGuncelle } from '../../actions'
import type { Tables } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function FirmaPersonelDuzenlePage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const idNum = parseInt(id, 10)
  if (Number.isNaN(idNum)) notFound()

  const { data: row, error } = await supabase
    .from('firma_calisanlar')
    .select('*')
    .eq('id', idNum)
    .single()

  if (error || !row) notFound()

  // Yeni Personel ekranıyla aynı veri kaynağı: tanim_mudurluk + firma_calisanlar
  const [
    { data: kayitlar },
    { data: tanimMud },
    { data: tanimOgr },
    { data: fcAyrilis },
    { data: khAyrilis },
  ] = await Promise.all([
    supabase.from('firma_calisanlar').select('gorev_mudurlugu'),
    supabase.from('tanim_mudurluk').select('mudurluk_adi').order('mudurluk_adi'),
    supabase.from('tanim_ogrenim').select('isim').eq('aktif', true).order('isim'),
    supabase.from('firma_calisanlar').select('ayrilis_nedeni').not('ayrilis_nedeni', 'is', null),
    supabase.from('kadro_hareketleri').select('ayrilis_nedeni').not('ayrilis_nedeni', 'is', null),
  ])

  const tanimMudList = (tanimMud ?? []).map(m => m.mudurluk_adi)
  const fcMudList = (kayitlar ?? []).map(k => k.gorev_mudurlugu ?? '').filter(Boolean)
  const mevcutMud = (row as { gorev_mudurlugu?: string | null }).gorev_mudurlugu ?? ''
  const mudurluler = [...new Set([...tanimMudList, ...fcMudList, mevcutMud].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'))

  const ogrenimler = (tanimOgr ?? []).map(o => o.isim)

  const ayrilisNedenleri = [...new Set([
    ...(fcAyrilis ?? []).map(r => r.ayrilis_nedeni).filter(Boolean),
    ...(khAyrilis ?? []).map(r => r.ayrilis_nedeni).filter(Boolean),
  ])].sort((a, b) => String(a).localeCompare(String(b), 'tr'))

  return (
    <FirmaPersonelDuzenleClient
      kayit={row as Tables<'firma_calisanlar'>}
      mudurluler={mudurluler}
      ogrenimler={ogrenimler}
      ayrilisNedenleri={ayrilisNedenleri as string[]}
      onGuncelle={firmaGuncelle}
    />
  )
}
