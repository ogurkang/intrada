import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'
import { yoneticiOgrenimDurumListeSatirlari } from '@/lib/rapor-yonetici-ogrenim-durum-liste'

export async function GET() {
  try {
    const supabase = await createClient()
    const D = new Date().toISOString().slice(0, 10)
    const anlikTarihEtiket = new Date().toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    const [{ data: calisanRaw }, { data: kadroRaw }, { data: ogrenimRaw }] = await Promise.all([
      supabase.from('calisan').select('sicil_no, ad_soyad'),
      supabase
        .from('kadro_hareketleri')
        .select('asil, vekil, statu, kadro_unvani, gorev_unvani, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu'),
      supabase
        .from('calisan_ogrenim')
        .select('sicil_no, ogrenim_turu, okul_adi, bolum, mezuniyet_tarihi, meslegi, varsayilan'),
    ])

    const satirlar = yoneticiOgrenimDurumListeSatirlari({
      D,
      calisanlar: calisanRaw ?? [],
      kadroRows: kadroRaw ?? [],
      ogrenimRows: ogrenimRaw ?? [],
    })
    const siraBySicil = new Map<string, number>()
    let sira = 0
    for (const r of satirlar) {
      if (!siraBySicil.has(r.sicil_no)) {
        sira += 1
        siraBySicil.set(r.sicil_no, sira)
      }
    }

    const rows: (string | number)[][] = [
      ['Yönetici Öğrenim Durum Listesi'],
      [`Anlık görüntü: ${anlikTarihEtiket}`],
      [''],
      ['Sıra No', 'Sicil No', 'Adı Soyadı', 'Görev Unvanı', 'Öğrenim Türü', 'Okul Adı', 'Bölüm', 'Mezuniyet Tarihi', 'Mesleği', 'Varsayılan'],
      ...satirlar.map((s, i) => [siraBySicil.get(s.sicil_no) ?? i + 1, s.sicil_no, s.ad_soyad, s.gorev_unvani, s.ogrenim_turu, s.okul_adi, s.bolum, s.mezuniyet_tarihi, s.meslegi, s.varsayilan]),
    ]

    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
    ]
    ws['!cols'] = [{ wch: 8 }, { wch: 14 }, { wch: 28 }, { wch: 22 }, { wch: 16 }, { wch: 28 }, { wch: 20 }, { wch: 16 }, { wch: 18 }, { wch: 12 }]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Yonetici Ogrenim')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const filename = 'Yonetici_Ogrenim_Durum_Listesi.xlsx'
    const encodedFilename = encodeURIComponent(filename)

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`,
      },
    })
  } catch (err) {
    console.error('YONETICI_OGRENIM_DURUM_LISTE_EXCEL_HATA', err)
    return NextResponse.json({ error: 'Excel olusturulamadi.' }, { status: 500 })
  }
}
