import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { anketRaporPdfBuffer } from '@/lib/anket-rapor-pdf'
import { anketRaporYukle } from '@/lib/anket-yukle'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 })
    const access = await getAppAccess(supabase, user.id)
    if (!isAdminLike(access)) return NextResponse.json({ error: 'Bu işlem yalnızca yönetici hesaplarındadır.' }, { status: 403 })

    const id = new URL(req.url).searchParams.get('id')?.trim() ?? ''
    if (!id) return NextResponse.json({ error: 'Kayıt bulunamadı.' }, { status: 400 })

    const rapor = await anketRaporYukle(id)
    if ('hata' in rapor) return NextResponse.json({ error: rapor.hata }, { status: 404 })

    const pdf = await anketRaporPdfBuffer({
      baslik: rapor.baslik,
      katilim: rapor.katilim,
      kurumMetin: rapor.kurumMetin,
      sorular: rapor.sorular.map(s => ({ sira: s.sira, metin: s.metin, sonuc: s.sonuc, kirilimlar: s.kirilimlar })),
    })
    const ad = rapor.baslik.replace(/[^\p{L}\p{N}]+/gu, '_') || 'anket'
    const filename = `Anket_Raporu_${ad}.pdf`
    const filenameAscii = filename.replace(/[^\x20-\x7E]/g, '_')

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filenameAscii}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    })
  } catch (e) {
    console.error('[anket rapor pdf]', e)
    return NextResponse.json({ error: 'Belge oluşturulamadı.' }, { status: 500 })
  }
}
