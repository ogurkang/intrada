import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess } from '@/lib/app-access'
import { intradaAsistanCevapla, type AsistanMesaj } from '@/lib/intrada-asistan-cevap'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ hata: 'Oturum gerekli.' }, { status: 401 })
    }

    const access = await getAppAccess(supabase, user.id)
    if (access.mode === 'blocked') {
      return NextResponse.json({ hata: 'Hesap erişimi kapalı.' }, { status: 403 })
    }

    const body = (await req.json()) as { mesaj?: string; gecmis?: AsistanMesaj[] }
    const mesaj = String(body.mesaj ?? '').trim()
    if (!mesaj || mesaj.length > 2000) {
      return NextResponse.json({ hata: 'Geçersiz mesaj.' }, { status: 400 })
    }

    const gecmis = Array.isArray(body.gecmis)
      ? body.gecmis
          .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
          .slice(-10)
      : []

    const { cevap, veriKullanildi } = await intradaAsistanCevapla({
      supabase,
      access,
      mesaj,
      gecmis,
    })

    return NextResponse.json({ cevap, veriKullanildi })
  } catch (e) {
    console.error('ASISTAN_CHAT', e)
    return NextResponse.json({ hata: 'Asistan yanıt üretemedi.' }, { status: 500 })
  }
}
