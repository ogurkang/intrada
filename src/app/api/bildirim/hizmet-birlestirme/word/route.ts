import { NextResponse } from 'next/server'
import { AlignmentType, Document, Packer, Paragraph, TextRun } from 'docx'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import {
  HIZMET_BIRLESTIRME_BIRIM,
  HIZMET_BIRLESTIRME_MAKAM,
  HIZMET_BIRLESTIRME_METIN,
  hizmetBirlestirmeBelgeAlanlari,
  hizmetBirlestirmeTarihFormat,
} from '@/lib/hizmet-birlestirme-belge'

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

function altSatir(etiket: string, deger: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 80 },
    children: [run(`${etiket} : ${deger || '—'}`)],
  })
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
      .from('hizmet_birlestirme_islemleri')
      .select(
        'id, sicil_no, ad_soyad, tckn, personel_durum, emeklilik_sicil_no, ssk, bagkur_sicil_no, hizmet_illeri, created_at',
      )
      .eq('id', id)
      .maybeSingle()

    if (!kayit) {
      return NextResponse.json({ error: 'Kayıt bulunamadı.' }, { status: 404 })
    }

    if (!isAdminLike(access)) {
      if (
        access.mode !== 'kullanici' ||
        !kayit.sicil_no ||
        String(access.sicilNo ?? '').trim() !== String(kayit.sicil_no).trim()
      ) {
        return NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 })
      }
    }

    const tarih = kayit.created_at
      ? hizmetBirlestirmeTarihFormat(new Date(kayit.created_at))
      : hizmetBirlestirmeTarihFormat()

    const alanlar = hizmetBirlestirmeBelgeAlanlari(kayit, tarih)

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
              children: [run(`İşlem Tarihi: ${alanlar.tarih}`)],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [run(HIZMET_BIRLESTIRME_MAKAM, { bold: true })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 600 },
              children: [run(HIZMET_BIRLESTIRME_BIRIM)],
            }),
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              indent: { firstLine: 708 },
              spacing: { after: 200, line: 360 },
              children: [run(HIZMET_BIRLESTIRME_METIN)],
            }),
            bosSatir(),
            bosSatir(),
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              spacing: { after: 400 },
              children: [run(alanlar.ad_soyad, { bold: true })],
            }),
            bosSatir(),
            altSatir('T.C.Kimlik Numarası', alanlar.tckn),
            altSatir('Emeklilik Sicil Numarası', alanlar.emeklilik_sicil_no),
            altSatir('S.S.K.', alanlar.ssk),
            altSatir('Bağ-Kur Sicil Numarası', alanlar.bagkur_sicil_no),
            altSatir('Sigortalı Hizmetin Geçtiği İl/İller', alanlar.hizmet_illeri),
          ],
        },
      ],
    })

    const buf = await Packer.toBuffer(doc)
    const safeKey = alanlar.sicil_no || alanlar.tckn || String(kayit.id)
    const filename = `Hizmet_Birlestirme_${safeKey}.docx`
    const encodedFilename = encodeURIComponent(filename)

    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="Hizmet_Birlestirme.docx"; filename*=UTF-8''${encodedFilename}`,
      },
    })
  } catch (err) {
    console.error('HIZMET_BIRLESTIRME_WORD_HATA', err)
    return NextResponse.json({ error: 'Belge oluşturulamadı.' }, { status: 500 })
  }
}
