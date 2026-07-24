import { NextResponse } from 'next/server'
import { AlignmentType, Document, Packer, Paragraph, TextRun } from 'docx'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { mehilIzniImzaTablosu } from '@/lib/bildirim-word-imza'
import {
  BES_IPTAL_BIRIM,
  BES_IPTAL_MAKAM,
  besIptalBelgeAlanlari,
  besIptalTarihFormat,
} from '@/lib/bes-iptal-belge'

function run(text: string, opts?: { bold?: boolean }): TextRun {
  return new TextRun({
    text,
    bold: opts?.bold,
    font: 'Times New Roman',
    size: 24,
  })
}

function bosSatir(): Paragraph {
  return new Paragraph({ spacing: { after: 200 }, children: [run('')] })
}

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
      .from('bes_iptal_bildirimleri')
      .select('id, sicil_no, ad_soyad, tckn, created_at')
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
      ? besIptalTarihFormat(new Date(kayit.created_at))
      : besIptalTarihFormat()

    const alanlar = besIptalBelgeAlanlari(kayit, tarih)

    const doc = new Document({
      sections: [
        {
          properties: {
            page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } },
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              spacing: { after: 600 },
              children: [run(alanlar.tarih)],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [run(BES_IPTAL_MAKAM, { bold: true })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 600 },
              children: [run(BES_IPTAL_BIRIM)],
            }),
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              indent: { firstLine: 708 },
              spacing: { after: 200, line: 360 },
              children: [run(alanlar.metin)],
            }),
            bosSatir(),
            bosSatir(),
            mehilIzniImzaTablosu(alanlar.tckn, alanlar.ad_soyad),
          ],
        },
      ],
    })

    const buf = await Packer.toBuffer(doc)
    const safeKey = alanlar.sicil_no || alanlar.tckn || String(kayit.id)
    const filename = `BES_Iptal_Talebi_${safeKey}.docx`
    const encodedFilename = encodeURIComponent(filename)

    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="BES_Iptal_Talebi.docx"; filename*=UTF-8''${encodedFilename}`,
      },
    })
  } catch (err) {
    console.error('BES_IPTAL_WORD_HATA', err)
    return NextResponse.json({ error: 'Belge oluşturulamadı.' }, { status: 500 })
  }
}
