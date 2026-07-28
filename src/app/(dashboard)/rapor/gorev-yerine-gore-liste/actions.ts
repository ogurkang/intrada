'use server'

import { createClient } from '@/lib/supabase/server'
import {
  gorevYeriListeAyarKaydetInternal,
  gorevYeriListeDenetimdenGeriYukleInternal,
  gorevYeriListeReferansSiraKaydetInternal,
} from '@/lib/rapor-gorev-yerine-gore-liste-sync'

export async function gorevYeriListeAyarKaydet(kayitKeyleri: string[]): Promise<{ hata?: string }> {
  const supabase = await createClient()
  return gorevYeriListeAyarKaydetInternal(supabase, kayitKeyleri)
}

export async function gorevYeriListeReferansSiraKaydet(
  kayitKeyleri: string[],
): Promise<{ hata?: string; kayitSayisi?: number }> {
  const supabase = await createClient()
  return gorevYeriListeReferansSiraKaydetInternal(supabase, kayitKeyleri)
}

export async function gorevYeriListeDenetimdenGeriYukle(
  auditLogId: number,
): Promise<{ hata?: string; yuklenen?: number }> {
  const supabase = await createClient()
  return gorevYeriListeDenetimdenGeriYukleInternal(supabase, auditLogId)
}
