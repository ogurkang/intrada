import { createClient } from '@/lib/supabase/server'
import GostergeTanimClient from '@/components/tanimlar/GostergeTanimClient'
import type { Tables } from '@/types/database'

type GostergeRow = Tables<'tanim_gosterge'>

export default async function GostergeTanimPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tanim_gosterge')
    .select('*')
    .order('derece')
    .order('kademe')
    .order('id')

  const kayitlar: GostergeRow[] = data ?? []

  return (
    <>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          Veri yüklenirken hata: {error.message}
        </div>
      )}
      <GostergeTanimClient data={kayitlar} />
    </>
  )
}
