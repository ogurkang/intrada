import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ppGostergeBirimExcelOlustur } from '@/lib/pp-gosterge-birim-excel'
import { ppGostergeBirimRaporYili } from '@/lib/pp-gosterge-birim-rapor'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  const url = new URL(req.url)
  const yil = Number.parseInt(url.searchParams.get('yil') ?? '', 10)
  const rapor = await ppGostergeBirimRaporYili(supabase, Number.isFinite(yil) ? yil : null)
  const buf = await ppGostergeBirimExcelOlustur(rapor)
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Gosterge_Izleme_Sorumlu_Birimler_${rapor.yil}.xlsx"`,
    },
  })
}
