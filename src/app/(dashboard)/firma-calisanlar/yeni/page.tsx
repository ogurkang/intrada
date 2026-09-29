import { fetchAllFirmaCalisanlar } from '@/lib/supabase-sayfala'
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
    { data: tanimMud },
    { data: tanimSirket },
    { data: tanimOgr },
  ] = await Promise.all([
    fetchAllFirmaCalisanlar(supabase, 'gorev_mudurlugu'),
    supabase.from('tanim_mudurluk').select('mudurluk_adi').eq('aktif', true).order('mudurluk_adi'),
    sb.from('tanim_sirket').select('sirket_adi').eq('aktif', true).order('sirket_adi'),
    supabase.from('tanim_ogrenim').select('isim').eq('aktif', true),
  ])

  const tanimMudList = (tanimMud ?? []).map(m => m.mudurluk_adi)
  const tanimSirketList = (tanimSirket ?? []).map((s: { sirket_adi: string }) => s.sirket_adi)
  const fcMudList = (kayitlar ?? []).map(k => k.gorev_mudurlugu ?? '').filter(Boolean)
  const mudurluler = [...new Set([...tanimMudList, ...tanimSirketList, ...fcMudList])].sort((a, b) => a.localeCompare(b, 'tr'))

  const ogrenimler = sortOgrenimIsimListesi((tanimOgr ?? []).map(o => o.isim).filter(Boolean))

  return (
    <FirmaPersonelYeniClient
      mudurluler={mudurluler}
      ogrenimler={ogrenimler}
      onEkle={firmaEkle}
    />
  )
}
