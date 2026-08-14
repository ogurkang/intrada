import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DENETIM_BELGE_BUCKET } from '@/lib/denetim'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: raw } = await params
  const id = Number.parseInt(raw, 10)
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: 'Geçersiz belge.' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 })

  const { data: belge } = await supabase
    .from('denetim_belge')
    .select('dosya_adi, storage_path, mime_type')
    .eq('id', id)
    .maybeSingle()

  if (!belge?.storage_path) {
    return NextResponse.json({ error: 'Belge bulunamadı.' }, { status: 404 })
  }

  const { data, error } = await supabase.storage
    .from(DENETIM_BELGE_BUCKET)
    .createSignedUrl(belge.storage_path, 60, { download: belge.dosya_adi })

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? 'İndirme bağlantısı oluşturulamadı.' }, { status: 500 })
  }

  return NextResponse.redirect(data.signedUrl)
}
