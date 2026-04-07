import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'
import { ayyHesapla, type AyyIzinRow } from '@/lib/ayy-hesap'
import { applyGridBorders } from '@/lib/kesintiler-excel'

function tarih(t: string | null) {
  if (!t) return '—'
  return new Date(t).toLocaleDateString('tr-TR')
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const donemIdParam = searchParams.get('donem_id')
  const tip = searchParams.get('tip') ?? 'kategorik' // 'kategorik' | 'ozet'
  const donemId = parseInt(donemIdParam ?? '0', 10)
  if (!donemId || isNaN(donemId)) {
    return NextResponse.json({ error: 'donem_id gerekli' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: donem } = await supabase
    .from('aylik_yemek_yeni_donem')
    .select('id, donem_adi, baslangic_tarihi, bitis_tarihi')
    .eq('id', donemId)
    .single()
  if (!donem) {
    return NextResponse.json({ error: 'Dönem bulunamadı' }, { status: 404 })
  }

  const takvimGun = Math.floor(
    (new Date(donem.bitis_tarihi).setHours(0, 0, 0, 0) - new Date(donem.baslangic_tarihi).setHours(0, 0, 0, 0)) / 86_400_000
  ) + 1
  const donemMetin = `Dönem: ${tarih(donem.baslangic_tarihi)} - ${tarih(donem.bitis_tarihi)} (${takvimGun} gün)`

  const { data: tatilRaw } = await supabase
    .from('tanim_izin_tatil')
    .select('tatil_adi, tatil_turu, tatil_baslangici, tatil_bitisi, durum')
    .eq('durum', true)
  const tatiller = (tatilRaw ?? []).map(t => ({
    tatil_adi:        t.tatil_adi,
    tatil_turu:       t.tatil_turu,
    tatil_baslangici: t.tatil_baslangici,
    tatil_bitisi:     t.tatil_bitisi,
    durum:            t.durum ?? true,
  }))

  const { data: secimRaw } = await supabase
    .from('aylik_yemek_yeni_secim')
    .select('izin_sira_no, dahil')
    .eq('donem_id', donemId)
  const haricSiraNoSet = new Set((secimRaw ?? []).filter(s => s.dahil === false).map(s => s.izin_sira_no))

  const { data: kadroRaw } = await supabase
    .from('kadro_hareketleri')
    .select('asil, vekil, ayrilis_tarihi')
    .is('ayrilis_tarihi', null)
    .in('statu', ['Memur', 'Sözleşmeli'])
  const memurSozlesmeliSiciller = new Set<string>()
  for (const k of kadroRaw ?? []) {
    const sicil = (k.asil ?? k.vekil ?? '').trim()
    if (sicil) memurSozlesmeliSiciller.add(sicil)
  }

  const genisBaslangic = new Date(donem.baslangic_tarihi)
  genisBaslangic.setFullYear(genisBaslangic.getFullYear() - 2)
  const genisBitis = new Date(donem.bitis_tarihi)
  genisBitis.setFullYear(genisBitis.getFullYear() + 1)

  const { data: izinRaw } = await supabase
    .from('izin_hareketleri')
    .select('sira_no, sicil_no, tur, ayrilis, baslama, gun')
    .neq('durum', 'İptal Edildi')
    .lte('ayrilis', genisBitis.toISOString().substring(0, 10))
    .gte('baslama', genisBaslangic.toISOString().substring(0, 10))
    .in('sicil_no', Array.from(memurSozlesmeliSiciller))
    .order('ayrilis')
    .limit(2000)

  const filtreliIzin = (izinRaw ?? []).filter(iz => {
    if (!iz.sira_no) return false
    if (haricSiraNoSet.has(iz.sira_no)) return false
    return true
  })

  const siciller = [...new Set(filtreliIzin.map(i => i.sicil_no).filter(Boolean))] as string[]
  const adMap: Record<string, string> = {}
  const zabitaSet = new Set<string>()
  const unvanMap: Record<string, string> = {}
  if (siciller.length > 0) {
    const { data: calisanlar } = await supabase.from('calisan').select('sicil_no, ad_soyad').in('sicil_no', siciller)
    ;(calisanlar ?? []).forEach(c => { if (c.sicil_no) adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no })
    const { data: kh } = await supabase
      .from('kadro_hareketleri')
      .select('asil, gorev_unvani, kadro_unvani, gorev_mudurlugu, kadro_mudurlugu')
      .in('asil', siciller)
      .is('ayrilis_tarihi', null)
    for (const k of kh ?? []) {
      const unvan = ((k.gorev_unvani ?? '') + ' ' + (k.kadro_unvani ?? '')).toLowerCase()
      const mud   = ((k.gorev_mudurlugu ?? '') + ' ' + (k.kadro_mudurlugu ?? '')).toLowerCase()
      const isZabita = unvan.includes('zabıta') || unvan.includes('zabita') ||
                      mud.includes('zabıta müdürlüğü') || mud.includes('zabita mudurlugu')
      if (isZabita && k.asil) zabitaSet.add(k.asil)
    }
    const { data: pk } = await supabase.from('personel_kadro_ozet').select('sicil_no, kadro_unvani').in('sicil_no', siciller)
    ;(pk ?? []).forEach(k => { if (k.sicil_no) unvanMap[k.sicil_no] = k.kadro_unvani ?? '' })
  }

  let odBySiraNo: Record<string, number> = {}
  const { data: prevDonemRaw } = await supabase
    .from('aylik_yemek_yeni_donem')
    .select('*')
    .lt('bitis_tarihi', donem.baslangic_tarihi)
    .order('bitis_tarihi', { ascending: false })
    .limit(1)

  if (prevDonemRaw && prevDonemRaw.length > 0) {
    const prev = prevDonemRaw[0]
    const { data: prevSecimRaw } = await supabase
      .from('aylik_yemek_yeni_secim')
      .select('izin_sira_no, dahil')
      .eq('donem_id', prev.id)
    const prevHaricSet = new Set((prevSecimRaw ?? []).filter(s => s.dahil === false).map(s => s.izin_sira_no))

    const prevGenisBaslangic = new Date(prev.baslangic_tarihi)
    prevGenisBaslangic.setFullYear(prevGenisBaslangic.getFullYear() - 2)
    const prevGenisBitis = new Date(prev.bitis_tarihi)
    prevGenisBitis.setFullYear(prevGenisBitis.getFullYear() + 1)

    const { data: prevIzinRaw } = await supabase
      .from('izin_hareketleri')
      .select('sira_no, sicil_no, tur, ayrilis, baslama, gun')
      .neq('durum', 'İptal Edildi')
      .lte('ayrilis', prevGenisBitis.toISOString().substring(0, 10))
      .gte('baslama', prevGenisBaslangic.toISOString().substring(0, 10))
      .order('ayrilis')

    const filtreliPrevIzin = (prevIzinRaw ?? []).filter(iz => {
      if (!iz.sira_no) return false
      if (prevHaricSet.has(iz.sira_no)) return false
      return memurSozlesmeliSiciller.has(iz.sicil_no ?? '')
    })

    const prevSiciller = [...new Set(filtreliPrevIzin.map(i => i.sicil_no).filter(Boolean))] as string[]
    const prevZabitaSet = new Set<string>()
    const prevUnvanMap: Record<string, string> = {}
    const prevAdMap: Record<string, string> = {}
    if (prevSiciller.length > 0) {
      const { data: cal } = await supabase.from('calisan').select('sicil_no, ad_soyad').in('sicil_no', prevSiciller)
      ;(cal ?? []).forEach(c => { if (c.sicil_no) prevAdMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no })
      const { data: pkh } = await supabase
        .from('kadro_hareketleri')
        .select('asil, gorev_unvani, kadro_unvani, gorev_mudurlugu, kadro_mudurlugu')
        .in('asil', prevSiciller)
        .is('ayrilis_tarihi', null)
      for (const k of pkh ?? []) {
        const unvan = ((k.gorev_unvani ?? '') + ' ' + (k.kadro_unvani ?? '')).toLowerCase()
        const mud   = ((k.gorev_mudurlugu ?? '') + ' ' + (k.kadro_mudurlugu ?? '')).toLowerCase()
        const isZabita = unvan.includes('zabıta') || unvan.includes('zabita') ||
                        mud.includes('zabıta müdürlüğü') || mud.includes('zabita mudurlugu')
        if (isZabita && k.asil) prevZabitaSet.add(k.asil)
      }
      const { data: ppk } = await supabase.from('personel_kadro_ozet').select('sicil_no, kadro_unvani').in('sicil_no', prevSiciller)
      ;(ppk ?? []).forEach(k => { if (k.sicil_no) prevUnvanMap[k.sicil_no] = k.kadro_unvani ?? '' })
    }

    const prevIzinler: AyyIzinRow[] = filtreliPrevIzin.map(iz => ({
      sira_no:  iz.sira_no!,
      sicil_no: iz.sicil_no ?? '',
      ad_soyad: prevAdMap[iz.sicil_no ?? ''] ?? iz.sicil_no ?? '',
      tur:      iz.tur ?? '',
      ayrilis:  iz.ayrilis,
      baslama:  iz.baslama,
      gun:      iz.gun ?? 0,
      isZabita: prevZabitaSet.has(iz.sicil_no ?? ''),
      unvan:    prevUnvanMap[iz.sicil_no ?? ''] ?? '',
    }))

    const prevSonuc = ayyHesapla({
      donemBas: prev.baslangic_tarihi,
      donemBit: prev.bitis_tarihi,
      izinler:  prevIzinler,
      tatiller,
    })
    for (const s of prevSonuc.satirlar) {
      if (s.SD > 0) odBySiraNo[s.sira_no] = s.SD
    }
  }

  const izinler: AyyIzinRow[] = filtreliIzin.map(iz => ({
    sira_no:  iz.sira_no!,
    sicil_no: iz.sicil_no ?? '',
    ad_soyad: adMap[iz.sicil_no ?? ''] ?? iz.sicil_no ?? '',
    tur:      iz.tur ?? '',
    ayrilis:  iz.ayrilis,
    baslama:  iz.baslama,
    gun:      iz.gun ?? 0,
    isZabita: zabitaSet.has(iz.sicil_no ?? ''),
    unvan:    unvanMap[iz.sicil_no ?? ''] ?? '',
  }))

  const sonuc = ayyHesapla({
    donemBas: donem.baslangic_tarihi,
    donemBit: donem.bitis_tarihi,
    izinler,
    tatiller,
    odBySiraNo,
  })

  const headers = ['Sıra No', 'Sicil No', 'Ad Soyad', 'Unvan', 'Önceki Dönemden', 'Ham İzin', 'Kesintilen İzin', 'Yemekli Gün', 'Yemek Alacağı Gün', 'Sonraki Döneme']
  const colCount = headers.length
  const acikGri = {
    fill: { fgColor: { rgb: 'E0E0E0' } },
    alignment: { horizontal: 'center' as const, vertical: 'center' as const, wrapText: true },
  }

  function mergeSatir(text: string): (string | { v: string; t: string; s: object })[] {
    return [
      { v: text, t: 's', s: acikGri },
      ...Array(colCount - 1).fill(null).map(() => ({ v: '', t: 's', s: acikGri })),
    ]
  }

  const kalinStil = { font: { bold: true } }
  function satir(p: { sira_no_seq: number; sicil_no: string; ad_soyad: string; unvan: string; OD: number; IZ: number; hamIzin: number; YG: number; K: number; SD: number; isZabita?: boolean }) {
    const vals = [p.sira_no_seq, p.sicil_no, p.ad_soyad, p.unvan, p.OD, p.hamIzin, p.IZ, p.YG, p.K, p.SD]
    if (p.isZabita) {
      return vals.map((v, i) => ({ v, t: typeof v === 'number' ? 'n' : 's', s: kalinStil }))
    }
    return vals
  }

  const rows: (string | number | { v: string | number; t: string; s: object })[][] = []
  const mergeRows: number[] = []
  const bosSatir = Array(colCount).fill('')

  function zabitalariAlta<T extends { isZabita?: boolean }>(list: T[]): T[] {
    const diger = list.filter(p => !p.isZabita)
    const zabitalar = list.filter(p => p.isZabita)
    return [...diger, ...zabitalar]
  }

  if (tip === 'ozet') {
    rows.push(mergeSatir('Aylık Yemek — Genel Özet'))
    mergeRows.push(rows.length - 1)
    rows.push(mergeSatir(donemMetin))
    mergeRows.push(rows.length - 1)
    rows.push(headers)
    if (sonuc.personeller.length === 0) {
      rows.push(['', '', 'Kayıt Yok', ...bosSatir.slice(4)])
    } else {
      zabitalariAlta(sonuc.personeller).forEach(p => rows.push(satir(p)))
    }
  } else {
    rows.push(mergeSatir('Aylık Yemek'))
    mergeRows.push(rows.length - 1)
    rows.push(mergeSatir(donemMetin))
    mergeRows.push(rows.length - 1)
    rows.push(mergeSatir('Takipteki İzinler'))
    mergeRows.push(rows.length - 1)
    rows.push(headers)
    if (sonuc.takipteki.length === 0) {
      rows.push(['', '', 'Kayıt Yok', ...bosSatir.slice(4)])
    } else {
      zabitalariAlta(sonuc.takipteki).forEach(p => rows.push(satir(p)))
    }
    rows.push(mergeSatir('Dönemdeki İzinler'))
    mergeRows.push(rows.length - 1)
    rows.push(headers)
    if (sonuc.donemdeki.length === 0) {
      rows.push(['', '', 'Kayıt Yok', ...bosSatir.slice(4)])
    } else {
      zabitalariAlta(sonuc.donemdeki).forEach(p => rows.push(satir(p)))
    }
    rows.push(mergeSatir('Askıdaki İzinler'))
    mergeRows.push(rows.length - 1)
    rows.push(headers)
    if (sonuc.askidaki.length === 0) {
      rows.push(['', '', 'Kayıt Yok', ...bosSatir.slice(4)])
    } else {
      zabitalariAlta(sonuc.askidaki).forEach(p => rows.push(satir(p)))
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!merges'] = mergeRows.map(r => ({ s: { r, c: 0 }, e: { r, c: colCount - 1 } }))
  applyGridBorders(ws, rows.length, colCount)

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Aylik Yemek')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true })

  const safeName = (`Aylik_Yemek_${donem.donem_adi ?? 'Donem'}`).replace(/[:\*\?\/\\]/g, ' ').trim().substring(0, 90) || 'Aylik_Yemek_Donem'
  const fallbackName = safeName.replace(/[^\x20-\x7E]/g, '_')
  const encodedFilename = encodeURIComponent(`${safeName}.xlsx`)

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fallbackName}.xlsx"; filename*=UTF-8''${encodedFilename}`,
    },
  })
}
