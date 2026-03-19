import { notFound } from 'next/navigation'
import AyyDetayClient from '@/components/kesintiler/AyyDetayClient'
import { createClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ donem_id: string }>
}

export default async function AyyDetayPage({ params }: Props) {
  const { donem_id } = await params
  const id = parseInt(donem_id, 10)
  if (isNaN(id)) notFound()

  const supabase = await createClient()
  const { data: donem } = await supabase
    .from('aylik_yemek_yeni_donem')
    .select('id')
    .eq('id', id)
    .single()
  if (!donem) notFound()

  return <AyyDetayClient donemId={id} />
}
