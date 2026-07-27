'use server'

import { createClient } from '@/lib/supabase/server'
import { gorevYeriListeAyarKaydetInternal } from '@/lib/rapor-gorev-yerine-gore-liste-sync'

export async function gorevYeriListeAyarKaydet(kayitKeyleri: string[]): Promise<{ hata?: string }> {
  const supabase = await createClient()
  return gorevYeriListeAyarKaydetInternal(supabase, kayitKeyleri)
}
