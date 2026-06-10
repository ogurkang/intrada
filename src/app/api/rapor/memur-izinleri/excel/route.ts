import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  parseMudurlukFromQuery,
  parseStatuIzinPeriyot,
  parseStatuIzinYil,
  statuIzinExcelOlustur,
} from '@/lib/rapor-statu-izinleri-excel'

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const yil = parseStatuIzinYil(searchParams.get('y'))
    const periyot = parseStatuIzinPeriyot(searchParams.get('p'))
    const mudurlukFiltre = parseMudurlukFromQuery(searchParams.get('m'))

    const { buf, filename } = await statuIzinExcelOlustur(supabase, {
      statuTip: 'memur',
      baslik: 'Memur İzinleri Raporu',
      sheetAdi: 'Memur Izinleri',
      dosyaAdi: 'Memur_Izinleri_Raporu',
      yil,
      periyot,
      mudurlukFiltre,
    })

    const encodedFilename = encodeURIComponent(filename)
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Memur_Izinleri_Raporu.xlsx"; filename*=UTF-8''${encodedFilename}`,
      },
    })
  } catch (err) {
    console.error('MEMUR_IZINLERI_EXCEL_HATA', err)
    return NextResponse.json({ error: 'Excel oluşturulamadı.' }, { status: 500 })
  }
}
