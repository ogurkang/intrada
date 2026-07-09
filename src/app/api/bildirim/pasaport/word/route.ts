import { NextResponse } from 'next/server'
import { AlignmentType, BorderStyle, Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import {
  PASAPORT_BIRIM,
  PASAPORT_DERECE_UYARI,
  PASAPORT_KONU_METNI,
  PASAPORT_MAKAM,
  PASAPORT_TELEFON_ETIKET,
  pasaportBelgeAlanlari,
  pasaportDereceUygunMu,
  pasaportGorevCumlesiSonu,
  pasaportTarihFormat,
} from '@/lib/pasaport-belge'

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

const KENAR_YOK = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }

function imzaTablosu(telefon: string, tckn: string, adSoyad: string): Table {
  const hucreKenar = {
    top: KENAR_YOK,
    bottom: KENAR_YOK,
    left: KENAR_YOK,
    right: KENAR_YOK,
  }
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: KENAR_YOK,
      bottom: KENAR_YOK,
      left: KENAR_YOK,
      right: KENAR_YOK,
      insideHorizontal: KENAR_YOK,
      insideVertical: KENAR_YOK,
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: hucreKenar,
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [run(PASAPORT_TELEFON_ETIKET)],
              }),
            ],
          }),
          new TableCell({
            borders: hucreKenar,
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [run(tckn)],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: hucreKenar,
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [run(telefon)],
              }),
            ],
          }),
          new TableCell({
            borders: hucreKenar,
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [run(adSoyad, { bold: true })],
              }),
            ],
          }),
        ],
      }),
    ],
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
      .from('pasaport_islemleri')
      .select(
        'id, sicil_no, ad_soyad, tckn, telefon, mudurluk, derece, unvan, personel_durum, ayrilis_nedeni, created_at',
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

    if (!pasaportDereceUygunMu(kayit.derece)) {
      return NextResponse.json({ error: PASAPORT_DERECE_UYARI }, { status: 400 })
    }

    const tarih = kayit.created_at
      ? pasaportTarihFormat(new Date(kayit.created_at))
      : pasaportTarihFormat()

    const alanlar = pasaportBelgeAlanlari(kayit, tarih)
    const sonCumle = pasaportGorevCumlesiSonu(alanlar.personelDurum, alanlar.ayrilisNedeni)

    const ilkParagrafChildren =
      alanlar.personelDurum === 'ayrilan'
        ? [
            run('Belediyenizde '),
            run(alanlar.derece),
            run(' dereceli '),
            run(alanlar.unvan),
            run(` ${sonCumle}`),
          ]
        : [
            run('Belediyenizde '),
            run(alanlar.mudurlukBaz),
            run(' Müdürlüğünde '),
            run(alanlar.sicil_no),
            run(' sicil numarası ile '),
            run(alanlar.derece),
            run(' dereceli '),
            run(alanlar.unvan),
            run(` ${sonCumle}`),
          ]

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
              children: [run(PASAPORT_MAKAM, { bold: true })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 600 },
              children: [run(PASAPORT_BIRIM)],
            }),
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              indent: { firstLine: 708 },
              spacing: { after: 200, line: 360 },
              children: ilkParagrafChildren,
            }),
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              indent: { firstLine: 708 },
              spacing: { after: 200, line: 360 },
              children: [run(PASAPORT_KONU_METNI)],
            }),
            bosSatir(),
            bosSatir(),
            imzaTablosu(alanlar.telefon, alanlar.tckn, alanlar.ad_soyad),
          ],
        },
      ],
    })

    const buf = await Packer.toBuffer(doc)
    const safeKey = alanlar.sicil_no || alanlar.tckn || String(kayit.id)
    const filename = `Yesil_Pasaport_Basvuru_${safeKey}.docx`
    const encodedFilename = encodeURIComponent(filename)

    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="Yesil_Pasaport_Basvuru.docx"; filename*=UTF-8''${encodedFilename}`,
      },
    })
  } catch (err) {
    console.error('PASAPORT_WORD_HATA', err)
    return NextResponse.json({ error: 'Belge oluşturulamadı.' }, { status: 500 })
  }
}
