'use client'

import { createClient } from '@/lib/supabase/client'
import { DENETIM_BELGE_BUCKET, denetimBelgeMimeCoz } from '@/lib/denetim'

/**
 * Dosyayı tarayıcıdan doğrudan Supabase Storage'a gönderir.
 * Sunucu aksiyonu gövdesi kullanılmadığı için platformun istek boyutu sınırı devreye girmez.
 */
export async function denetimBelgeStorageYukle(path: string, token: string, file: File): Promise<string | null> {
  const supabase = createClient()
  const { error } = await supabase.storage
    .from(DENETIM_BELGE_BUCKET)
    .uploadToSignedUrl(path, token, file, {
      contentType: denetimBelgeMimeCoz(file.name, file.type) ?? undefined,
    })
  return error ? error.message : null
}
