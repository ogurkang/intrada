import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { kullaniciPathAllowed } from '@/lib/menu-yetki'
import { yuklePersonelKazancBilgiKartlari } from '@/lib/personel-kazanc-bilgi-yukle'
import { personelKazancBilgiPdfBuffer } from '@/lib/personel-kazanc-bilgi-pdf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: Request) {
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
        kullaniciPathAllowed('/personel/kazanc-bilgileri', access.sicilNo, access.menuIzinleri)
      if (!izin) return NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 })
    }

    const body = (await req.json().catch(() => null)) as { siciller?: unknown } | null
    const siciller = Array.isArray(body?.siciller)
      ? body.siciller.map(s => String(s).trim()).filter(Boolean)
      : []
    if (!siciller.length) {
      return NextResponse.json({ error: 'Personel seçilmedi.' }, { status: 400 })
    }

    const kartlar = await yuklePersonelKazancBilgiKartlari(siciller)
    const sirali = siciller
      .map(s => kartlar.find(k => k.sicil_no === s))
      .filter((k): k is NonNullable<typeof k> => !!k)

    const pdf = await personelKazancBilgiPdfBuffer(sirali)
    const filename = 'Personel_Kazanc_Bilgileri.pdf'

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    })
  } catch (e) {
    console.error('[personel-kazanc-bilgi pdf]', e)
    return NextResponse.json({ error: 'Belge oluşturulamadı.' }, { status: 500 })
  }
}
