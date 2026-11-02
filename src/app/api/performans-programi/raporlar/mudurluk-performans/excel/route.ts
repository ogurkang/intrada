import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ppPerformansRaporYili } from '@/lib/pp-mudurluk-rapor'
import { ppPerformansExcelOlustur } from '@/lib/pp-performans-excel'
import { ppNorm } from '@/lib/pp-erisim'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  const url = new URL(req.url)
  const yil = Number.parseInt(url.searchParams.get('yil') ?? '', 10)
  const mudurluk = (url.searchParams.get('m') ?? '').trim()
  const rapor = await ppPerformansRaporYili(supabase, Number.isFinite(yil) ? yil : null)
  const sekme = rapor.sekmeler.find(s => ppNorm(s.mudurluk) === ppNorm(mudurluk)) ?? rapor.sekmeler[0]
  if (!sekme) return NextResponse.json({ error: 'Rapor bulunamadı' }, { status: 404 })

  const buf = await ppPerformansExcelOlustur(sekme.bloklar, rapor.yil)
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Mudurluk_Performans_Bilgisi_${rapor.yil}.xlsx"`,
    },
  })
}
