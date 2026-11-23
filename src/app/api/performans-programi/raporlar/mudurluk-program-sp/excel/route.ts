import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ppMudurlukProgramSpExcelOlustur } from '@/lib/pp-mudurluk-program-sp-excel'
import { ppMudurlukProgramSpRaporYili } from '@/lib/pp-mudurluk-program-sp-rapor'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const url = new URL(req.url)
  const yil = Number.parseInt(url.searchParams.get('yil') ?? '', 10)
  const rapor = await ppMudurlukProgramSpRaporYili(supabase, Number.isFinite(yil) ? yil : null)
  const buf = await ppMudurlukProgramSpExcelOlustur(rapor)
  const ad = `Mudurluk_Program_Alt_Program_SP_${rapor.yil}`
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${ad}.xlsx"`,
    },
  })
}
