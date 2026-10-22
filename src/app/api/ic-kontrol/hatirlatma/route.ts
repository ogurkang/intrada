import { NextResponse } from 'next/server'
import { ickHatirlatmaCalistir } from '@/lib/ick/hatirlatma'
import { tryCreateServiceRoleClient } from '@/lib/supabase/service-role'

export const runtime = 'nodejs'
export const maxDuration = 60

function yetkili(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  const baslik = req.headers.get('authorization')
  if (secret) return baslik === `Bearer ${secret}`
  return req.headers.get('x-vercel-cron') === '1'
}

/** Her sabah: tamamlanma tarihine 10 gün kalan eylemlere SMS. */
export async function GET(req: Request) {
  if (!yetkili(req)) return NextResponse.json({ hata: 'Yetki yok.' }, { status: 401 })
  const db = tryCreateServiceRoleClient()
  if (!db) return NextResponse.json({ hata: 'Servis anahtarı yok.' }, { status: 500 })
  const sonuc = await ickHatirlatmaCalistir(db)
  return NextResponse.json(sonuc, { status: sonuc.hata ? 500 : 200 })
}
