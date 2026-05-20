import { createClient } from '@/lib/supabase/server'
import YerleskeAdresiTanimClient from '@/components/tanimlar/YerleskeAdresiTanimClient'
import type { Tables } from '@/types/database'

type YerleskeRow = Tables<'tanim_yerleske_adresi'>

export default async function YerleskeAdresiPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tanim_yerleske_adresi')
    .select('*')
    .order('yerleske_adi')
    .order('id')

  const kayitlar: YerleskeRow[] = data ?? []

  return (
    <>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          Veri yüklenirken hata: {error.message}
        </div>
      )}
      <YerleskeAdresiTanimClient data={kayitlar} />
    </>
  )
}
