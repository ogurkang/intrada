import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ppMudurlukFaaliyetMaliyetExcelOlustur } from '@/lib/pp-mudurluk-faaliyet-maliyet-excel'
import {
  ppMudurlukFaaliyetMaliyetRaporYili,
  type PpMudurlukFaaliyetMaliyetSirala,
  type PpMudurlukFaaliyetMaliyetYon,
} from '@/lib/pp-mudurluk-faaliyet-maliyet-rapor'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const url = new URL(req.url)
  const yil = Number.parseInt(url.searchParams.get('yil') ?? '', 10)
  const siralaHam = url.searchParams.get('sirala') ?? 'ad'
  const yonHam = url.searchParams.get('yon') ?? 'asc'
  const sirala: PpMudurlukFaaliyetMaliyetSirala = siralaHam === 'butce' ? 'butce' : 'ad'
  const yon: PpMudurlukFaaliyetMaliyetYon = yonHam === 'desc' ? 'desc' : 'asc'

  const rapor = await ppMudurlukFaaliyetMaliyetRaporYili(supabase, Number.isFinite(yil) ? yil : null)
  const buf = await ppMudurlukFaaliyetMaliyetExcelOlustur(rapor, { sirala, yon })
  const ad = `Mudurluk_Faaliyet_Maliyetleri_${rapor.yil}`
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${ad}.xlsx"`,
    },
  })
}
