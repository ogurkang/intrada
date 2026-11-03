import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { paraTr } from '@/lib/ayliktan-kesme-hesap'
import { faizTuruEtiket, tarihTr } from '@/lib/kanuni-faiz'
import { kisiBorcuBelgeCoz } from '@/lib/kisi-borcu'
import KisiBorcuPlan from '@/components/hesaplama/KisiBorcuPlan'

export const dynamic = 'force-dynamic'

export default async function KisiBorcuDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const kayitId = Number(id)
  if (!Number.isFinite(kayitId)) notFound()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('kisi_borcu_kayitlari')
    .select('id, belge')
    .eq('id', kayitId)
    .maybeSingle()
  const belge = kisiBorcuBelgeCoz(data?.belge)
  if (!belge) notFound()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/hesaplama/kisi-borcu" className="text-sm text-slate-500 hover:text-slate-700">
            ← Kişi Borcu
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-800">{belge.ad_soyad}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {belge.sicil_no}{belge.tckn ? ` · ${belge.tckn}` : ''}{belge.unvan ? ` · ${belge.unvan}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Link
            href={`/hesaplama/kisi-borcu/${kayitId}/duzenle`}
            className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Düzenle
          </Link>
          <a
            href={`/api/hesaplama/kisi-borcu/pdf?id=${kayitId}`}
            className="inline-flex rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
          >
            PDF İndir
          </a>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Bilgi etiket="Faiz" deger={faizTuruEtiket(belge.faiz_turu)} />
        <Bilgi etiket="Ana tutar" deger={paraTr(belge.ana_tutar)} />
        <Bilgi etiket="Taksit sayısı" deger={String(belge.taksit_sayisi)} />
        <Bilgi etiket="Ödeme günü" deger={String(belge.odeme_gunu)} />
        <Bilgi etiket="Ödeme başlama tarihi" deger={tarihTr(belge.odeme_baslangic || belge.satirlar[0]?.vade || '')} />
        <Bilgi etiket="Faiz işlemeye başlama tarihi" deger={tarihTr(belge.faiz_baslangic)} />
        <Bilgi etiket="Toplam faiz" deger={paraTr(belge.toplam_faiz)} />
        <Bilgi etiket="Toplam ödeme" deger={paraTr(belge.toplam_odeme)} />
      </div>
      <p className="max-w-4xl text-sm leading-relaxed text-slate-600">{belge.dayanak}</p>
      <KisiBorcuPlan satirlar={belge.satirlar} />
    </div>
  )
}

function Bilgi({ etiket, deger }: { etiket: string; deger: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs text-slate-500">{etiket}</p>
      <p className="mt-1 text-sm font-medium text-slate-800">{deger}</p>
    </div>
  )
}
