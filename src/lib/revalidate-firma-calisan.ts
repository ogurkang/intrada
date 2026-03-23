import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function revalidateFirmaCalisanPaths(id: number) {
  const supabase = await createClient()
  revalidatePath(`/firma-calisanlar/${id}`)
  const { data } = await supabase.from('firma_calisanlar').select('public_id').eq('id', id).maybeSingle()
  if (data?.public_id) revalidatePath(`/link/${data.public_id}`)
}
