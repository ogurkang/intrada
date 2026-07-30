import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { raporExcelStandartResponse } from '@/lib/rapor-excel-standart'
import { isgSaglikTaramasiBilgiSnapshot } from '@/lib/rapor-isg-saglik-taramasi-bilgileri'

export const dynamic = 'force-dynamic'

const MIN_YIL = 2000
const MAX_YIL = 2035

function parseYil(v: string | null): number {
  const parsed = Number.parseInt(v ?? '', 10)
  if (!Number.isFinite(parsed)) return new Date().getFullYear()
  return Math.min(MAX_YIL, Math.max(MIN_YIL, parsed))
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const yil = parseYil(searchParams.get('y'))
    const satirlar = await isgSaglikTaramasiBilgiSnapshot(supabase, yil)

    const anlik = new Date().toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    return raporExcelStandartResponse({
      baslik: 'Sağlık Taraması Bilgileri',
      donemEtiket: `Yıl: ${yil}`,
      anlikTarihEtiket: `Anlık görüntü tarihi: ${anlik}`,
      kolonlar: ['Sıra No', 'Sicil No', 'Adı Soyadı', 'Müdürlüğü', 'Tehlike Sınıfı', 'Tarama', 'Muayene'],
      satirlar: satirlar.map((r, i) => [
        i + 1,
        r.sicil_no,
        r.ad_soyad,
        r.mudurluk,
        r.tehlike_sinifi,
        r.tarama,
        r.muayene,
      ]),
      sheetName: 'Saglik Taramasi',
      downloadFileName: `ISG_Saglik_Taramasi_Bilgileri_${yil}.xlsx`,
    })
  } catch (err) {
    console.error('ISG_SAGLIK_TARAMASI_BILGI_EXCEL', err)
    return NextResponse.json({ error: 'Excel oluşturulamadı.' }, { status: 500 })
  }
}
