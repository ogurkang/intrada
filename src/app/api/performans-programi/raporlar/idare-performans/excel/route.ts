import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ppKodTemiz } from '@/lib/pp-iliski'
import { ppIdareBloklariTekil, ppPerformansRaporYili, type PpPerformansBlok } from '@/lib/pp-mudurluk-rapor'
import { ppPerformansExcelOlustur } from '@/lib/pp-performans-excel'

function blokBul(
  rapor: Awaited<ReturnType<typeof ppPerformansRaporYili>>,
  tum: PpPerformansBlok[],
  ap: number,
  ah: number,
): PpPerformansBlok | undefined {
  const direkt = tum.find(b => b.altHedefId === ah)
  if (direkt) return direkt

  let kod = ''
  for (const s of rapor.sekmeler) {
    const ham = s.bloklar.find(b => b.altHedefId === ah)
    if (ham?.hedefKod) {
      kod = ppKodTemiz(ham.hedefKod)
      break
    }
  }
  if (kod) {
    const kodla = tum.find(b => ppKodTemiz(b.hedefKod ?? '') === kod)
    if (kodla) return kodla
  }

  if (Number.isFinite(ap)) {
    return tum.find(b => b.altProgramId === ap && b.altHedefId === ah)
  }
  return undefined
}

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
  if (Number.isFinite(ah)) {
    const tek = blokBul(rapor, tum, ap, ah)
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
