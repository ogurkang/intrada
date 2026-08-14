import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DENETIM_BELGE_BUCKET } from '@/lib/denetim'

export async function GET(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 })
  }

  const id = Number.parseInt(new URL(req.url).searchParams.get('id') ?? '', 10)
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: 'Geçersiz belge.' }, { status: 400 })
  }

  const { data: belge } = await supabase
    .from('denetim_belge')
    .select('id, dosya_adi, storage_path, mime_type')
    .eq('id', id)
    .maybeSingle()

  if (!belge?.storage_path) {
    return NextResponse.json({ error: 'Belge bulunamadı.' }, { status: 404 })
  }

  const { data: signed, error } = await supabase.storage
    .from(DENETIM_BELGE_BUCKET)
    .createSignedUrl(belge.storage_path, 120)

  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: 'İndirme bağlantısı oluşturulamadı.' }, { status: 500 })
  }

  const encoded = encodeURIComponent(belge.dosya_adi)
  const fallback = belge.dosya_adi.replace(/[^\x20-\x7E]/g, '_') || 'belge'

  return NextResponse.redirect(signed.signedUrl, {
    headers: {
      'Content-Disposition': `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`,
    },
  })
}
