import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'
import { trNormalize } from '@/lib/turkce-search'

function unvanOncelik(unvan: string): number | null {
  const n = trNormalize(unvan)
  if (n.includes('belediye baskani')) return 0
  if (n.includes('baskan yardimci')) return 1
  if (n.includes('mudur')) return 2
  return null
}

export async function GET() {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const [{ data: kadroRaw }, { data: calisanRaw }, { data: ayarRaw }] = await Promise.all([
      supabase
        .from('kadro_hareketleri')
        .select('id, kadro_unvani, asil, vekil, iptal_karar_tarihi, iptal_karar_no')
        .order('id', { ascending: true }),
      supabase.from('calisan').select('sicil_no, ad_soyad, telefon, e_posta'),
      sb.from('rapor_yonetici_iletisim_liste_ayar').select('kayit_key, sira_no').order('sira_no', { ascending: true }),
    ])

    const calisanBySicil = new Map(
      (calisanRaw ?? []).map(c => [
        String(c.sicil_no ?? '').trim(),
        {
          ad_soyad: String(c.ad_soyad ?? '').trim(),
          telefon: String(c.telefon ?? '').trim(),
          e_posta: String(c.e_posta ?? '').trim(),
        },
      ]),
    )

    const tumSatirlar: Array<{
      kayit_key: string
      sicil_no: string
      ad_soyad: string
      kadro_unvani: string
      telefon: string
      e_posta: string
    }> = []

    for (const k of kadroRaw ?? []) {
      const unvan = String(k.kadro_unvani ?? '').trim()
      const oncelik = unvanOncelik(unvan)
      if (oncelik == null) continue
      if (k.iptal_karar_tarihi || k.iptal_karar_no) continue
      const adaylar: Array<{ rol: 'asil' | 'vekil'; sicil: string }> = [
        { rol: 'asil', sicil: String(k.asil ?? '').trim() },
        { rol: 'vekil', sicil: String(k.vekil ?? '').trim() },
      ]
      for (const a of adaylar) {
        if (!a.sicil) continue
        const c = calisanBySicil.get(a.sicil)
        if (!c) continue
        tumSatirlar.push({
          kayit_key: `kadro:${k.id}:${a.rol}:${a.sicil}`,
          sicil_no: a.sicil,
          ad_soyad: c.ad_soyad || '—',
          kadro_unvani: unvan || '—',
          telefon: c.telefon || '—',
          e_posta: c.e_posta || '—',
        })
      }
    }

    tumSatirlar.sort((a, b) => {
      const o1 = unvanOncelik(a.kadro_unvani) ?? 99
      const o2 = unvanOncelik(b.kadro_unvani) ?? 99
      if (o1 !== o2) return o1 - o2
      return a.ad_soyad.localeCompare(b.ad_soyad, 'tr')
    })

    const satirByKey = new Map(tumSatirlar.map(s => [s.kayit_key, s] as const))
    const seciliKeys = (ayarRaw ?? [])
      .map((a: { kayit_key: string | null }) => String(a.kayit_key ?? '').trim())
      .filter(Boolean) as string[]
    const satirlar = seciliKeys
      .map((k: string) => satirByKey.get(k))
      .filter((x): x is (typeof tumSatirlar)[number] => !!x)

    const rows: (string | number)[][] = [
      ['Yönetici İletişim Bilgileri Listesi'],
      [`Anlık görüntü tarihi: ${new Date().toLocaleDateString('tr-TR')}`],
      [],
      ['Sıra No', 'Sicil No', 'Adı Soyadı', 'Kadro Unvanı', 'Telefon Numarası', 'E-Posta Adresi'],
      ...satirlar.map((r, i) => [i + 1, r.sicil_no, r.ad_soyad, r.kadro_unvani, r.telefon, r.e_posta]),
    ]

    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }]
    ws['!cols'] = [{ wch: 8 }, { wch: 14 }, { wch: 24 }, { wch: 30 }, { wch: 20 }, { wch: 28 }]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Yönetici İletişim')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Yonetici_Iletisim_Bilgileri_Listesi.xlsx"',
      },
    })
  } catch (err) {
    console.error('YONETICI_ILETISIM_EXCEL_HATA', err)
    return NextResponse.json({ error: 'Excel olusturulamadi.' }, { status: 500 })
  }
}
