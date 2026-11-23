import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ppIdareBloklariTekil, ppIdareTabloKey, ppPerformansRaporYili } from '@/lib/pp-mudurluk-rapor'
import { ppPerformansExcelOlustur } from '@/lib/pp-performans-excel'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  const url = new URL(req.url)
  const yil = Number.parseInt(url.searchParams.get('yil') ?? '', 10)
  const ap = Number.parseInt(url.searchParams.get('ap') ?? '', 10)
  const ah = Number.parseInt(url.searchParams.get('ah') ?? '', 10)
  const rapor = await ppPerformansRaporYili(supabase, Number.isFinite(yil) ? yil : null, { mudurlukKaynak: 'secilen' })
  const tum = ppIdareBloklariTekil(rapor)
  if (!tum.length) return NextResponse.json({ error: 'Rapor bulunamadı' }, { status: 404 })

  let bloklar = tum
  if (Number.isFinite(ap) && Number.isFinite(ah)) {
    const key = ppIdareTabloKey(ap, ah)
    const tek = tum.find(
      b => b.tabloKey === key || (b.altProgramId === ap && b.altHedefId === ah),
    )
    if (!tek) return NextResponse.json({ error: 'Tablo bulunamadı' }, { status: 404 })
    bloklar = [tek]
  }

  const buf = await ppPerformansExcelOlustur(bloklar, rapor.yil, { tabloBaslik: 'İDARE PERFORMANS BİLGİSİ' })
  const ad = Number.isFinite(ah) ? `Idare_Performans_${rapor.yil}_${ah}` : `Idare_Performans_Bilgisi_${rapor.yil}`
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${ad}.xlsx"`,
    },
  })
}
