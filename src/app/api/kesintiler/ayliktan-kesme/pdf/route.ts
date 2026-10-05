import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { kullaniciPathAllowed } from '@/lib/menu-yetki'
import type { AyliktanKesmeBordro } from '@/lib/ayliktan-kesme-hesap'
import { ayliktanKesmePdfBuffer } from '@/lib/ayliktan-kesme-pdf'
import { ayliktanKesmeBordroGoster } from '@/lib/ayliktan-kesme-yukle'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function bordroMu(raw: unknown): raw is AyliktanKesmeBordro {
  if (!raw || typeof raw !== 'object') return false
  const b = raw as AyliktanKesmeBordro
  return Array.isArray(b.satirlar) && typeof b.toplam === 'number' && !!b.kaynak && !!b.katsayi
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 })

    const access = await getAppAccess(supabase, user.id)
    if (!isAdminLike(access)) {
      const izin =
        access.mode === 'kullanici' &&
        kullaniciPathAllowed('/kesintiler/ayliktan-kesme', access.sicilNo, access.menuIzinleri)
      if (!izin) return NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 })
    }

    const id = Number(new URL(req.url).searchParams.get('id'))
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: 'Kayıt bulunamadı.' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('ayliktan_kesme_bordrolari')
      .select('id, ad_soyad, bordro')
      .eq('id', id)
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || !bordroMu(data.bordro)) {
      return NextResponse.json({ error: 'Kayıt bulunamadı.' }, { status: 404 })
    }

    const pdf = await ayliktanKesmePdfBuffer(await ayliktanKesmeBordroGoster(supabase, data.bordro))
    const ad = String(data.ad_soyad ?? 'bordro').replace(/[^\p{L}\p{N}]+/gu, '_')
    const filename = `Ayliktan_Kesme_${ad}.pdf`
    const filenameAscii = filename.replace(/[^\x20-\x7E]/g, '_')

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filenameAscii}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    })
  } catch (e) {
    console.error('[ayliktan-kesme pdf]', e)
    return NextResponse.json({ error: 'Belge oluşturulamadı.' }, { status: 500 })
  }
}
