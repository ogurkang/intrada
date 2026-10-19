import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { epostaAyarHazirMi, fetchEpostaAyar } from '@/lib/eposta-ayar'
import { epostaEkIndir } from '@/lib/eposta-kutu'
import type { EpostaKutu } from '@/lib/eposta-tipler'

export const runtime = 'nodejs'
export const maxDuration = 60

function kutuMu(v: string): v is EpostaKutu {
  return v === 'gelen' || v === 'giden' || v === 'spam'
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const kutu = url.searchParams.get('kutu') ?? ''
  const uid = url.searchParams.get('uid') ?? ''
  const sira = Number(url.searchParams.get('sira') ?? '-1')
  if (!kutuMu(kutu)) return NextResponse.json({ hata: 'Klasör yok.' }, { status: 400 })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ hata: 'Oturum yok.' }, { status: 401 })
  const access = await getAppAccess(supabase, user.id)
  if (!isAdminLike(access)) return NextResponse.json({ hata: 'Yetki yok.' }, { status: 403 })
  const ayar = await fetchEpostaAyar(supabase)
  if (!epostaAyarHazirMi(ayar) || !ayar) return NextResponse.json({ hata: 'E-posta ayarı eksik.' }, { status: 400 })

  const sonuc = await epostaEkIndir(ayar, kutu, uid, sira)
  if ('hata' in sonuc) return NextResponse.json({ hata: sonuc.hata }, { status: 404 })
  const ascii = sonuc.ad.replace(/[^\x20-\x7E]/g, '_')
  return new NextResponse(new Uint8Array(sonuc.icerik), {
    headers: {
      'Content-Type': sonuc.tip,
      'Content-Disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(sonuc.ad)}`,
      'Cache-Control': 'no-store',
    },
  })
}
