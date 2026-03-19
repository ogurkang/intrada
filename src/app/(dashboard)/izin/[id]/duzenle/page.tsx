import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'
import IzinDuzenleClient from '@/components/izin/IzinDuzenleClient'
import { izinGuncelle, izinDurumDegistir } from '../../actions'

interface Props {
  params: Promise<{ id: string }>
}

export default async function IzinDuzenlePage({ params }: Props) {
  const { id } = await params
  const numId = parseInt(id, 10)
  if (isNaN(numId)) notFound()

  const supabase = await createClient()

  const [{ data: izin, error }, { data: izinTurleriRaw }] = await Promise.all([
    supabase.from('izin_hareketleri').select('*').eq('id', numId).single(),
    supabase.from('tanim_izin_tur').select('tur_adi').eq('durum', true).order('sira_no', { nullsFirst: false }).order('tur_adi'),
  ])

  if (error || !izin) notFound()

  const { data: calisanRow } = await supabase
    .from('calisan')
    .select('ad_soyad')
    .eq('sicil_no', izin.sicil_no)
    .maybeSingle()

  const izinTurleri = (izinTurleriRaw ?? []).map(t => t.tur_adi)

  return (
    <div>
      {/* Başlık */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">İzin Hareketi - Düzenle</h1>
        <Link href={`/izin?yil=${izin.yil ?? new Date().getFullYear()}`}
          className="flex items-center gap-2 border border-slate-300 text-slate-700 text-sm px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
          ← Listeye Dön
        </Link>
      </div>

      <IzinDuzenleClient
        izin={izin as Tables<'izin_hareketleri'>}
        adSoyad={calisanRow?.ad_soyad ?? null}
        izinTurleri={izinTurleri}
        onGuncelle={izinGuncelle}
        onDurumDegistir={izinDurumDegistir}
      />
    </div>
  )
}
