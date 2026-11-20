import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ppEkoMaliyetExcelOlustur } from '@/lib/pp-eko-maliyet-excel'
import { ppEkoMaliyetRaporYili } from '@/lib/pp-eko-maliyet-rapor'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  const url = new URL(req.url)
  const yil = Number.parseInt(url.searchParams.get('yil') ?? '', 10)
  const rapor = await ppEkoMaliyetRaporYili(supabase, Number.isFinite(yil) ? yil : null)
  const buf = await ppEkoMaliyetExcelOlustur(rapor)
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Ekonomik_Siniflandirma_PP_Maliyeti_${rapor.yil}.xlsx"`,
    },
  })
}
