import { createClient } from '@/lib/supabase/server'
import IzinListClient from '@/components/izin/IzinListClient'
import type { Tables } from '@/types/database'

type IzinHareketi = Tables<'izin_hareketleri'>

interface Props {
  searchParams: Promise<{ yil?: string }>
}

export default async function IzinPage({ searchParams }: Props) {
  const { yil: yilParam } = await searchParams
  const secilenYil = yilParam ? parseInt(yilParam, 10) : new Date().getFullYear()

  // Geçerli yıl değilse varsayılana dön
  const yil = Number.isFinite(secilenYil) ? secilenYil : new Date().getFullYear()

  // Yıl aralığı: bu yıl dahil son 5 yıl + önümüzdeki yıl
  const buYil = new Date().getFullYear()
  const yillar = Array.from({ length: 6 }, (_, i) => buYil + 1 - i)

  const supabase = await createClient()

  const [
    { data: hareketlerRaw, error },
    { data: calisanlarRaw },
    { data: izinTurleriRaw },
    { data: hakRaw },
  ] = await Promise.all([
    supabase
      .from('izin_hareketleri')
      .select('*')
      .eq('yil', yil)
      .order('id', { ascending: false }),
    supabase
      .from('calisan')
      .select('sicil_no, ad_soyad')
      .order('ad_soyad'),
    supabase
      .from('tanim_izin_tur')
      .select('tur_adi')
      .eq('durum', true)
      .order('sira_no', { nullsFirst: false })
      .order('tur_adi'),
    supabase
      .from('izin_haklari')
      .select('sicil_no, kalan_gun')
      .eq('yil', yil),
  ])

  const hareketler = (hareketlerRaw ?? []) as IzinHareketi[]
  const personeller = (calisanlarRaw ?? []) as { sicil_no: string; ad_soyad: string }[]
  const izinTurleri = (izinTurleriRaw ?? []).map(t => t.tur_adi)

  // sicil_no → kalan_gun
  const hakMap: Record<string, number> = {}
  ;(hakRaw ?? []).forEach(h => { hakMap[h.sicil_no] = h.kalan_gun })

  return (
    <>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          Veri yüklenirken hata: {error.message}
        </div>
      )}
      <IzinListClient
        hareketler={hareketler}
        secilenYil={yil}
        yillar={yillar}
        personeller={personeller}
        izinTurleri={izinTurleri}
        hakMap={hakMap}
      />
    </>
  )
}
