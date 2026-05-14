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
  ] = await Promise.all([
    supabase.from('firma_calisanlar').select('gorev_mudurlugu'),
    sb.from('tanim_sirket').select('sirket_adi').eq('aktif', true).order('sirket_adi'),
    supabase.from('tanim_ogrenim').select('isim').eq('aktif', true),
  ])

  // Şirket tanımlarından öncelikli, mevcut kayıtlar fallback olarak eklenir
  const tanimSirketList = (tanimSirket ?? []).map((s: { sirket_adi: string }) => s.sirket_adi)
  const fcMudList = (kayitlar ?? []).map(k => k.gorev_mudurlugu ?? '').filter(Boolean)
  const mudurluler = [...new Set([...tanimSirketList, ...fcMudList])].sort((a, b) => a.localeCompare(b, 'tr'))

  const ogrenimler = sortOgrenimIsimListesi((tanimOgr ?? []).map(o => o.isim).filter(Boolean))

  return (
    <FirmaPersonelYeniClient
      mudurluler={mudurluler}
      ogrenimler={ogrenimler}
      onEkle={firmaEkle}
    />
  )
}
