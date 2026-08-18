import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { KYS_BELGE_BUCKET } from '@/lib/kys'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ hata: 'Oturum gerekli.' }, { status: 401 })

  const url = new URL(req.url)
  const id = Number.parseInt(url.searchParams.get('id') ?? '', 10)
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ hata: 'Geçersiz belge.' }, { status: 400 })
  }

  const { data: belge } = await supabase
    .from('kys_belge')
    .select('id, dosya_adi, storage_path, mime_type')
    .eq('id', id)
    .maybeSingle()
  if (!belge?.storage_path) {
    return NextResponse.json({ hata: 'Belge bulunamadı.' }, { status: 404 })
  }

  const { data, error } = await supabase.storage
    .from(KYS_BELGE_BUCKET)
    .createSignedUrl(belge.storage_path, 120)
  if (error || !data?.signedUrl) {
    return NextResponse.json({ hata: 'Belge görüntülenemedi.' }, { status: 500 })
  }

  return NextResponse.json({
    url: data.signedUrl,
    bucket: KYS_BELGE_BUCKET,
    path: belge.storage_path,
    dosyaAdi: belge.dosya_adi,
    mimeType: belge.mime_type,
  })
}
