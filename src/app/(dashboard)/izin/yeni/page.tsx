import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import IzinYeniClient from '@/components/izin/IzinYeniClient'
import { izinEkle } from '../actions'

interface Props {
  searchParams: Promise<{ yil?: string }>
}

export default async function IzinYeniPage({ searchParams }: Props) {
  const { yil: yilParam } = await searchParams
  const yil = yilParam ? parseInt(yilParam, 10) : new Date().getFullYear()
  const secilenYil = Number.isFinite(yil) ? yil : new Date().getFullYear()

  const supabase = await createClient()

  const [{ data: personeller }, { data: izinTurleriRaw }, { data: hakRaw }] = await Promise.all([
    supabase.from('calisan').select('sicil_no, ad_soyad').order('ad_soyad'),
    supabase.from('tanim_izin_tur').select('tur_adi').eq('durum', true).order('sira_no', { nullsFirst: false }).order('tur_adi'),
    supabase.from('izin_haklari').select('sicil_no, kalan_gun').eq('yil', secilenYil),
  ])

  const hakMap: Record<string, number> = {}
  ;(hakRaw ?? []).forEach(h => { hakMap[h.sicil_no] = h.kalan_gun })
  const izinTurleri = (izinTurleriRaw ?? []).map(t => t.tur_adi)

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Yeni İzin Kaydı</h1>
        <Link href={`/izin?yil=${secilenYil}`}
          className="flex items-center gap-2 border border-slate-300 text-slate-700 text-sm px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
          ← Listeye Dön
        </Link>
      </div>

      <IzinYeniClient
        yil={secilenYil}
        personeller={(personeller ?? []) as { sicil_no: string; ad_soyad: string }[]}
        izinTurleri={izinTurleri}
        hakMap={hakMap}
        onEkle={izinEkle}
      />
    </div>
  )
}
