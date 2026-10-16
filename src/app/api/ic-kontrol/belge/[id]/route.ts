import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ickYetkiYukle, type IckDb } from '@/lib/ick/erisim'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ hata: 'Oturum yok.' }, { status: 401 })
  const db = supabase as IckDb
  const { yetki } = await ickYetkiYukle(db, user.id, user.email)
  if (!yetki.okuyabilir) return NextResponse.json({ hata: 'Yetki yok.' }, { status: 403 })

  const { data: v } = await db.from('ick_belge_versiyon').select('storage_path, dosya_adi').eq('id', Number(id)).maybeSingle()
  if (!v) return NextResponse.json({ hata: 'Belge bulunamadı.' }, { status: 404 })
  const { data, error } = await db.storage.from('ick-belgeler').createSignedUrl(v.storage_path, 60, { download: v.dosya_adi })
  if (error || !data?.signedUrl) return NextResponse.json({ hata: 'Bağlantı oluşturulamadı.' }, { status: 500 })
  return NextResponse.redirect(data.signedUrl)
}
