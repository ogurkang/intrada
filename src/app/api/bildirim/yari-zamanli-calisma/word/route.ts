import { NextResponse } from 'next/server'
import { Packer } from 'docx'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { yzcBelgeAlanlari, yzcTarihFormat } from '@/lib/yari-zamanli-calisma-belge'
import { yzcWordDocument } from '@/lib/yari-zamanli-calisma-word'

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 })
    }

    const access = await getAppAccess(supabase, user.id)
    const { searchParams } = new URL(req.url)
    const id = parseInt(String(searchParams.get('id') ?? ''), 10)
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Kayıt belirtilmedi.' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: kayit } = await (supabase as any)
      .from('yari_zamanli_calisma_bildirimleri')
      .select(
        'id, sicil_no, ad_soyad, tckn, unvan, mudurluk, cocuk_dogum_tarihi, yari_zamanli_baslangic_tarihi, normal_zamanli_donus_tarihi, calisma_programi, created_at',
      )
      .eq('id', id)
      .maybeSingle()

    if (!kayit) {
      return NextResponse.json({ error: 'Kayıt bulunamadı.' }, { status: 404 })
    }

    if (!isAdminLike(access)) {
      if (
        access.mode !== 'kullanici' ||
        String(access.sicilNo ?? '').trim() !== String(kayit.sicil_no ?? '').trim()
      ) {
        return NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 })
      }
    }

    const tarih = kayit.created_at
      ? yzcTarihFormat(new Date(kayit.created_at))
      : yzcTarihFormat()

    const alanlar = yzcBelgeAlanlari(kayit, tarih)
    const doc = yzcWordDocument(alanlar)
    const buf = await Packer.toBuffer(doc)
    const safeKey = alanlar.sicil_no || alanlar.tckn || String(kayit.id)
    const filename = `Yari_Zamanli_Calisma_${safeKey}.docx`
    const encodedFilename = encodeURIComponent(filename)

    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="Yari_Zamanli_Calisma.docx"; filename*=UTF-8''${encodedFilename}`,
      },
    })
  } catch (err) {
    console.error('YZC_WORD_HATA', err)
    return NextResponse.json({ error: 'Belge oluşturulamadı.' }, { status: 500 })
  }
}
