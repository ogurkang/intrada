import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DENETIM_BELGE_BUCKET, type DenetimBelgeTuru } from '@/lib/denetim'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 })

  const url = new URL(req.url)
  const id = Number.parseInt(url.searchParams.get('id') ?? '', 10)
  const tur = url.searchParams.get('tur') as DenetimBelgeTuru
  if (!Number.isFinite(id) || id <= 0 || (tur !== 'karar' && tur !== 'bolum')) {
    return NextResponse.json({ error: 'Geçersiz belge.' }, { status: 400 })
  }

  const table = tur === 'karar' ? 'denetim_karar_belge' : 'denetim_bolum_belge'
  const { data: belge } = await supabase
    .from(table)
    .select('id, dosya_adi, storage_path, mime_type')
    .eq('id', id)
    .maybeSingle()
  if (!belge?.storage_path) {
    return NextResponse.json({ error: 'Belge bulunamadı.' }, { status: 404 })
  }

  const { data: file, error } = await supabase.storage
    .from(DENETIM_BELGE_BUCKET)
    .download(belge.storage_path)
  if (error || !file) {
    return NextResponse.json({ error: 'Belge görüntülenemedi.' }, { status: 500 })
  }

  const safeName = belge.dosya_adi.replace(/["\r\n]/g, '_')
  return new NextResponse(file, {
    headers: {
      'Content-Type': belge.mime_type || file.type || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${safeName}"`,
      'Cache-Control': 'private, no-store, max-age=0',
      Pragma: 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
    },
  })
}
