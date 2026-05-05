import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { yoneticiOgrenimDurumListeSatirlari } from '@/lib/rapor-yonetici-ogrenim-durum-liste'
import { raporExcelStandartResponse } from '@/lib/rapor-excel-standart'

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

    return raporExcelStandartResponse({
      baslik: 'Yönetici Öğrenim Durum Listesi',
      donemEtiket: 'Sekme: YILLIK',
      anlikTarihEtiket: `Anlık görüntü tarihi: ${anlikTarihEtiket}`,
      kolonlar: ['Sıra No', 'Sicil No', 'Adı Soyadı', 'Görev Unvanı', 'Öğrenim Türü', 'Okul Adı', 'Bölüm', 'Mezuniyet Tarihi', 'Mesleği', 'Varsayılan'],
      satirlar: satirlar.map((s, i) => [siraBySicil.get(s.sicil_no) ?? i + 1, s.sicil_no, s.ad_soyad, s.gorev_unvani, s.ogrenim_turu, s.okul_adi, s.bolum, s.mezuniyet_tarihi, s.meslegi, s.varsayilan]),
      sheetName: 'Yonetici Ogrenim',
      downloadFileName: 'Yonetici_Ogrenim_Durum_Listesi.xlsx',
    })
  } catch (err) {
    console.error('YONETICI_OGRENIM_DURUM_LISTE_EXCEL_HATA', err)
    return NextResponse.json({ error: 'Excel olusturulamadi.' }, { status: 500 })
  }
}
