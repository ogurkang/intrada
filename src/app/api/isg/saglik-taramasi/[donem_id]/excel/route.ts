import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { raporExcelStandartResponse } from '@/lib/rapor-excel-standart'
import { isgSaglikTaramasiAktifPersonelYukle } from '@/lib/isg-saglik-taramasi-personel'

export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ donem_id: string }> },
) {
  try {
    const { donem_id: didStr } = await params
    const donemId = Number.parseInt(didStr, 10)
    if (!Number.isFinite(donemId) || donemId <= 0) {
      return NextResponse.json({ error: 'Geçersiz dönem.' }, { status: 400 })
    }

    const { searchParams } = new URL(req.url)
    const mudFiltre = (searchParams.get('m') ?? '').trim()
    const statuFiltre = (searchParams.get('s') ?? '').trim()

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const [{ data: donem, error: donemErr }, personeller] = await Promise.all([
      sb
        .from('isg_saglik_taramasi_donem')
        .select('id, sira_no, donem_adi, baslangic_tarihi, bitis_tarihi')
        .eq('id', donemId)
        .maybeSingle(),
      isgSaglikTaramasiAktifPersonelYukle(supabase),
    ])

    if (donemErr) {
      console.error('ISG_SAGLIK_EXCEL_DONEM', donemErr)
      return NextResponse.json({ error: 'Dönem bilgisi alınamadı.' }, { status: 500 })
    }
    if (!donem) return NextResponse.json({ error: 'Dönem bulunamadı.' }, { status: 404 })

    const { data: kayitRaw, error: kayitErr } = await sb
      .from('isg_saglik_taramasi_kayit')
      .select('sicil_no, tarama, muayene')
      .eq('donem_id', donemId)

    if (kayitErr) {
      console.error('ISG_SAGLIK_EXCEL_KAYIT', kayitErr)
      return NextResponse.json({ error: 'Kayıt bilgisi alınamadı.' }, { status: 500 })
    }

    const taramaSet = new Set<string>()
    const muayeneSet = new Set<string>()
    for (const k of kayitRaw ?? []) {
      if (k.tarama) taramaSet.add(k.sicil_no)
      if (k.muayene) muayeneSet.add(k.sicil_no)
    }

    const fmt = (t: string) => new Date(t).toLocaleDateString('tr-TR')
    const donemEtiket = `${donem.donem_adi} · ${fmt(donem.baslangic_tarihi)} – ${fmt(donem.bitis_tarihi)}`
    const anlikTarihEtiket = `Anlık görüntü tarihi: ${new Date().toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })}`

    const evetHayir = (v: boolean) => (v ? 'Evet' : 'Hayır')

    let filtreli = personeller
    if (mudFiltre) {
      filtreli = filtreli.filter(p => (p.mudurluk ?? 'Belirtilmemiş') === mudFiltre)
    }
    if (statuFiltre) {
      filtreli = filtreli.filter(p => p.statu === statuFiltre)
    }

    const satirlar = filtreli.map((p, i) => [
      i + 1,
      p.sicil_no,
      p.ad_soyad,
      p.statu,
      p.mudurluk ?? '—',
      evetHayir(taramaSet.has(p.sicil_no)),
      evetHayir(muayeneSet.has(p.sicil_no)),
    ])

    const filtreEtiketleri: string[] = []
    if (mudFiltre) filtreEtiketleri.push(`Müdürlük: ${mudFiltre}`)
    if (statuFiltre) filtreEtiketleri.push(`Statü: ${statuFiltre}`)
    const filtreEtiket = filtreEtiketleri.length ? ` · ${filtreEtiketleri.join(' · ')}` : ''

    return raporExcelStandartResponse({
      baslik: 'Sağlık Taraması Personel Listesi',
      donemEtiket: `${donemEtiket}${filtreEtiket}`,
      anlikTarihEtiket,
      kolonlar: ['Sıra No', 'Sicil No', 'Adı Soyadı', 'Statü', 'Müdürlük', 'Tarama', 'Muayene'],
      satirlar,
      sheetName: 'Saglik Taramasi',
      downloadFileName: `Saglik_Taramasi_Donem_${donem.sira_no}.xlsx`,
      totalLabel: 'Toplam personel',
      totalValue: filtreli.length,
    })
  } catch (e) {
    console.error('ISG_SAGLIK_EXCEL', e)
    return NextResponse.json({ error: 'Excel oluşturulamadı.' }, { status: 500 })
  }
}
