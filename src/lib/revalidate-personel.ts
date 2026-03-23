import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/** Eski `/personel/{sicil}` ve canonical `/link/{public_id}` detaylarını yeniler. */
export async function revalidatePersonelDetayPaths(sicil_no: string) {
  const supabase = await createClient()
  revalidatePath(`/personel/${sicil_no}`)
  const { data } = await supabase.from('calisan').select('public_id').eq('sicil_no', sicil_no).maybeSingle()
  if (data?.public_id) revalidatePath(`/link/${data.public_id}`)
}
