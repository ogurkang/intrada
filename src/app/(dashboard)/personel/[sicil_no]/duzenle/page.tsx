import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import PersonelKisiselDuzenleClient from '@/components/personel/PersonelKisiselDuzenleClient'
import { calisanGuncelle } from '../actions'
import type { Tables } from '@/types/database'

interface Props {
  params: Promise<{ sicil_no: string }>
  searchParams?: Promise<{ kaynak?: string }>
}

export default async function PersonelDuzenlePage({ params, searchParams }: Props) {
  const { sicil_no } = await params
  const supabase = await createClient()

  const { data: calisan, error } = await supabase
    .from('calisan')
    .select('*')
    .eq('sicil_no', sicil_no)
    .single()

  if (error || !calisan) notFound()

  const sp = await searchParams?.catch(() => ({} as { kaynak?: string }))
  const kaynak = sp?.kaynak ?? ''

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href={kaynak === 'ayrilanlar' ? '/personel/ayrilanlar' : '/personel'} className="hover:text-slate-800 transition-colors">
          {kaynak === 'ayrilanlar' ? 'Ayrılanlar' : 'Çalışanlar'}
        </Link>
        <span className="text-slate-300">/</span>
        <Link href={`/personel/${sicil_no}${kaynak ? `?kaynak=${kaynak}` : ''}`} className="hover:text-slate-800 transition-colors">
          {calisan.ad_soyad}
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-medium">Düzenle</span>
      </nav>

      <PersonelKisiselDuzenleClient
        calisan={calisan as Tables<'calisan'>}
        kaynak={kaynak || undefined}
        onGuncelle={calisanGuncelle}
      />
    </div>
  )
}
