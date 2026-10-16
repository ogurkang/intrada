'use client'

import { createClient } from '@/lib/supabase/client'

/** Dosyayı imzalı adresle tarayıcıdan doğrudan ick-belgeler kovasına gönderir. */
export async function ickBelgeStorageYukle(path: string, token: string, file: File): Promise<string | null> {
  const supabase = createClient()
  const { error } = await supabase.storage.from('ick-belgeler').uploadToSignedUrl(path, token, file, {
    contentType: file.type || undefined,
  })
  return error ? error.message : null
}
