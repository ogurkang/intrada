import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ickYetkiYukle, type IckDb } from '@/lib/ick/erisim'
import { ickRaporVerisi } from '@/lib/ick/rapor'
import { ickRaporDocx } from '@/lib/ick/rapor-docx'
import { ickRaporPdf } from '@/lib/ick/rapor-pdf'
import { ickRaporXlsx } from '@/lib/ick/rapor-xlsx'

export const runtime = 'nodejs'

const MIME = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
} as const

export async function GET(req: Request, { params }: { params: Promise<{ donemId: string }> }) {
  const { donemId } = await params
  const bicim = (new URL(req.url).searchParams.get('bicim') ?? 'docx') as keyof typeof MIME
  if (!(bicim in MIME)) return NextResponse.json({ hata: 'Biçim docx, xlsx veya pdf olmalı.' }, { status: 400 })
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ hata: 'Oturum yok.' }, { status: 401 })
  const db = supabase as IckDb
  const { yetki } = await ickYetkiYukle(db, user.id, user.email)
  if (!yetki.okuyabilir) return NextResponse.json({ hata: 'Yetki yok.' }, { status: 403 })

  const { veri, hata } = await ickRaporVerisi(db, Number(donemId))
  if (!veri) return NextResponse.json({ hata }, { status: 404 })
  const buffer = bicim === 'docx' ? await ickRaporDocx(veri) : bicim === 'xlsx' ? await ickRaporXlsx(veri) : await ickRaporPdf(veri)
  const ad = `${veri.planDonem}_ic_kontrol_izleme_${veri.donemBaslik.split(' ')[0]}_${veri.kilitli ? 'kesin' : 'taslak'}.${bicim}`
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': MIME[bicim],
      'Content-Disposition': `attachment; filename="${ad}"`,
      'Cache-Control': 'no-store',
    },
  })
}
