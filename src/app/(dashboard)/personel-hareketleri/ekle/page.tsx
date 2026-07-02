import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PersonelHareketiEkleClient from '@/components/personel/PersonelHareketiEkleClient'

export default async function PersonelHareketiEklePage({
  searchParams,
}: {
  searchParams?: Promise<{ popup?: string }>
}) {
  const sp = await searchParams?.catch(() => ({} as { popup?: string }))
  const popup = String(sp?.popup ?? '').trim() === '1'

  const supabase = await createClient()
  const { data: personeller } = await supabase
    .from('calisan')
    .select('sicil_no, ad_soyad')
    .order('ad_soyad')

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Yeni Personel Hareketi</h1>
        <Link
          href="/personel-hareketleri"
          className="flex items-center gap-2 border border-slate-300 text-slate-700 text-sm px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
        >
          ← Listeye Dön
        </Link>
      </div>

      <PersonelHareketiEkleClient
        personeller={(personeller ?? []) as { sicil_no: string; ad_soyad: string }[]}
        popup={popup}
      />
    </div>
  )
}
