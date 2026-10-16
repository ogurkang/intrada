import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ickYetkiYukle, type IckDb } from '@/lib/ick/erisim'
import { ickPlanWordUret } from '@/lib/ick/plan-docx'

export const runtime = 'nodejs'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const planId = Number(id)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ hata: 'Oturum yok.' }, { status: 401 })
  const db = supabase as IckDb
  const { yetki } = await ickYetkiYukle(db, user.id, user.email)
  if (!yetki.okuyabilir) return NextResponse.json({ hata: 'Yetki yok.' }, { status: 403 })

  const sonuc = await ickPlanWordUret(db, planId)
  if ('hata' in sonuc) return NextResponse.json({ hata: sonuc.hata }, { status: 404 })
  const ascii = sonuc.dosyaAdi.replace(/İ/g, 'I')
  return new NextResponse(new Uint8Array(sonuc.buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(sonuc.dosyaAdi)}`,
      'Cache-Control': 'no-store',
    },
  })
}
