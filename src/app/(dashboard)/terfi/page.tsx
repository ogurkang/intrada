import { createClient } from '@/lib/supabase/server'
import TerfiDonemClient from '@/components/terfi/TerfiDonemClient'
import type { Tables } from '@/types/database'
import { terfiDonemAc, terfiDonemEkle, terfiDonemGuncelle, terfiDonemKapat } from './donem/actions'

export default async function TerfiDonemleriPage() {
  const supabase = await createClient()
  const { data: donemRaw } = await supabase.from('terfi_donem').select('*').order('id', { ascending: false })

  const donemler = (donemRaw ?? []).map((d) => ({ ...(d as Tables<'terfi_donem'>) }))

  return (
    <TerfiDonemClient
      donemler={donemler}
      onEkle={terfiDonemEkle}
      onGuncelle={terfiDonemGuncelle}
      onKapat={terfiDonemKapat}
      onAc={terfiDonemAc}
    />
  )
}
