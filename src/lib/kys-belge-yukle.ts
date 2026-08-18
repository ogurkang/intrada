'use client'

import { createClient } from '@/lib/supabase/client'
import { KYS_BELGE_BUCKET, kysBelgeMimeCoz } from '@/lib/kys'

export async function kysBelgeStorageYukle(path: string, token: string, file: File): Promise<string | null> {
  const supabase = createClient()
  const { error } = await supabase.storage
    .from(KYS_BELGE_BUCKET)
    .uploadToSignedUrl(path, token, file, {
      contentType: kysBelgeMimeCoz(file.name, file.type) ?? undefined,
    })
  return error ? error.message : null
}
