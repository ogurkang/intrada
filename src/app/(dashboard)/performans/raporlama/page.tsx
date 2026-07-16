import { createClient } from '@/lib/supabase/server'
import PerformansRaporlamaClient from '@/components/performans/PerformansRaporlamaClient'

export default async function PerformansRaporlamaPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: rows } = await db
    .from('performans_degerlendirme')
    .select('id, sicil_no, ortalama, durum, donem:performans_donem(yil)')
    .not('ortalama', 'is', null)
    .lte('ortalama', 59)
    .order('ortalama', { ascending: true })

  const siciller = [...new Set((rows ?? []).map((r: { sicil_no: string }) => r.sicil_no))] as string[]
  const adMap: Record<string, string> = {}
  if (siciller.length > 0) {
    const { data: cal } = await supabase.from('calisan').select('sicil_no, ad_soyad').in('sicil_no', siciller)
    ;(cal ?? []).forEach(c => {
      if (c.sicil_no) adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no
    })
  }

  const satirlar = (rows ?? []).map((r: {
    id: number
    sicil_no: string
    ortalama: number | null
    durum: string
    donem: { yil: number } | null
  }) => ({
    id: r.id,
    sicil_no: r.sicil_no,
    ad_soyad: adMap[r.sicil_no] ?? r.sicil_no,
    yil: r.donem?.yil ?? 0,
    ortalama: r.ortalama,
    durum: r.durum,
  }))

  return <PerformansRaporlamaClient satirlar={satirlar} />
}
