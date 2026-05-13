import { createClient } from '@/lib/supabase/server'
import FirmaPersonelYeniClient from '@/components/personel/FirmaPersonelYeniClient'
import { sortOgrenimIsimListesi } from '@/lib/ogrenim-sira'
import { firmaEkle } from '../actions'

export default async function FirmaPersonelYeniPage() {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const [
    { data: kayitlar },
    { data: tanimSirket },
    { data: tanimOgr },
    { data: fcAyrilis },
    { data: khAyrilis },
  ] = await Promise.all([
    supabase.from('firma_calisanlar').select('gorev_mudurlugu'),
    sb.from('tanim_sirket').select('sirket_adi').eq('aktif', true).order('sirket_adi'),
    supabase.from('tanim_ogrenim').select('isim').eq('aktif', true),
    supabase.from('firma_calisanlar').select('ayrilis_nedeni').not('ayrilis_nedeni', 'is', null),
    supabase.from('kadro_hareketleri').select('ayrilis_nedeni').not('ayrilis_nedeni', 'is', null),
  ])

  // Şirket tanımlarından öncelikli, mevcut kayıtlar fallback olarak eklenir
  const tanimSirketList = (tanimSirket ?? []).map((s: { sirket_adi: string }) => s.sirket_adi)
  const fcMudList = (kayitlar ?? []).map(k => k.gorev_mudurlugu ?? '').filter(Boolean)
  const mudurluler = [...new Set([...tanimSirketList, ...fcMudList])].sort((a, b) => a.localeCompare(b, 'tr'))

  const ogrenimler = sortOgrenimIsimListesi((tanimOgr ?? []).map(o => o.isim).filter(Boolean))

  const ayrilisNedenleri = [...new Set([
    ...(fcAyrilis ?? []).map(r => r.ayrilis_nedeni).filter(Boolean),
    ...(khAyrilis ?? []).map(r => r.ayrilis_nedeni).filter(Boolean),
  ])].sort((a, b) => String(a).localeCompare(String(b), 'tr'))

  return (
    <FirmaPersonelYeniClient
      mudurluler={mudurluler}
      ogrenimler={ogrenimler}
      ayrilisNedenleri={ayrilisNedenleri as string[]}
      onEkle={firmaEkle}
    />
  )
}
