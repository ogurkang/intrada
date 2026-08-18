import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DENETIM_BELGE_BUCKET, type DenetimBelgeTuru } from '@/lib/denetim'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ hata: 'Oturum gerekli.' }, { status: 401 })

  const url = new URL(req.url)
  const id = Number.parseInt(url.searchParams.get('id') ?? '', 10)
  const tur = url.searchParams.get('tur') as DenetimBelgeTuru
  if (!Number.isFinite(id) || id <= 0 || (tur !== 'karar' && tur !== 'bolum')) {
    return NextResponse.json({ hata: 'Geçersiz belge.' }, { status: 400 })
  }

  const table = tur === 'karar' ? 'denetim_karar_belge' : 'denetim_bolum_belge'
  const { data: belge } = await supabase
    .from(table)
    .select('id, dosya_adi, storage_path, mime_type')
    .eq('id', id)
    .maybeSingle()
  if (!belge?.storage_path) {
    return NextResponse.json({ hata: 'Belge bulunamadı.' }, { status: 404 })
  }

  const { data, error } = await supabase.storage
    .from(DENETIM_BELGE_BUCKET)
    .createSignedUrl(belge.storage_path, 120)
  if (error || !data?.signedUrl) {
    return NextResponse.json({ hata: 'Belge görüntülenemedi.' }, { status: 500 })
  }

  return NextResponse.json({
    url: data.signedUrl,
    bucket: DENETIM_BELGE_BUCKET,
    path: belge.storage_path,
    dosyaAdi: belge.dosya_adi,
    mimeType: belge.mime_type,
  })
}
