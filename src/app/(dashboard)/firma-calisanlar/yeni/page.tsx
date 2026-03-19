import { createClient } from '@/lib/supabase/server'
import FirmaPersonelYeniClient from '@/components/personel/FirmaPersonelYeniClient'
import { firmaEkle } from '../actions'

export default async function FirmaPersonelYeniPage() {
  const supabase = await createClient()

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

  // Müdürlük tanımlarından (tanim_mudurluk) öncelikli
  const tanimMudList = (tanimMud ?? []).map(m => m.mudurluk_adi)
  const fcMudList = (kayitlar ?? []).map(k => k.gorev_mudurlugu ?? '').filter(Boolean)
  const mudurluler = [...new Set([...tanimMudList, ...fcMudList])].sort((a, b) => a.localeCompare(b, 'tr'))

  const ogrenimler = (tanimOgr ?? []).map(o => o.isim)

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
