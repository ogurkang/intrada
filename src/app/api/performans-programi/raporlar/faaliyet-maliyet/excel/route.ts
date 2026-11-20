import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ppFaaliyetMaliyetExcelOlustur } from '@/lib/pp-faaliyet-maliyet-excel'
import { ppFaaliyetMaliyetRaporYili } from '@/lib/pp-faaliyet-maliyet-rapor'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  const url = new URL(req.url)
  const yil = Number.parseInt(url.searchParams.get('yil') ?? '', 10)
  const rapor = await ppFaaliyetMaliyetRaporYili(supabase, Number.isFinite(yil) ? yil : null)
  const buf = await ppFaaliyetMaliyetExcelOlustur(rapor)
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Faaliyetler_Duzeyinde_PP_Maliyeti_${rapor.yil}.xlsx"`,
    },
  })
}
