import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'
import {
  ayyBuildIzinHavuzu,
  ayyGetOncekiDonem,
  ayyDonemTuruNorm,
  ayyIzinDbToAyyIzinRow,
  ayyLoadDonem,
  ayyLoadTatiller,
  ayySdSonrakiDonemIcin,
  createAyyHavuzMemo,
} from '@/lib/ayy-donem-havuz'
import { ayyHesapla } from '@/lib/ayy-hesap'
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

  const donem = await ayyLoadDonem(supabase, donemId)
  if (!donem) {
    return NextResponse.json({ error: 'Dönem bulunamadı' }, { status: 404 })
  }

  const takvimGun = Math.floor(
    (new Date(donem.bitis_tarihi).setHours(0, 0, 0, 0) - new Date(donem.baslangic_tarihi).setHours(0, 0, 0, 0)) / 86_400_000
  ) + 1
  const donemMetin = `Dönem: ${tarih(donem.baslangic_tarihi)} - ${tarih(donem.bitis_tarihi)} (${takvimGun} gün) · Tür: ${String(donem.donem_turu ?? 'normal')}`

  const { data: secimRaw } = await supabase
    .from('aylik_yemek_yeni_secim')
    .select('izin_sira_no, dahil')
    .eq('donem_id', donemId)
  const haricSiraNoSet = new Set((secimRaw ?? []).filter(s => s.dahil === false).map(s => s.izin_sira_no))

  const memo = createAyyHavuzMemo()
  const poolRaw = await ayyBuildIzinHavuzu(supabase, donemId, donem, memo)
  const dahilRaw = poolRaw.filter(r => !haricSiraNoSet.has(String(r.sira_no)))

  const tatiller = await ayyLoadTatiller(supabase)
  const izinler = await ayyIzinDbToAyyIzinRow(supabase, dahilRaw)
  const odBySiraNo = await ayySdSonrakiDonemIcin(supabase, donemId, donem, tatiller, memo)
  const prevIzBySiraNo = memo.prevIzDoneme.get(donemId) ?? {}
  const prevPersonelIzOverflowBySicilNo = memo.prevPersonelIzOverflow.get(donemId) ?? {}
  const onceki = await ayyGetOncekiDonem(
    supabase,
    donem.baslangic_tarihi,
    ayyDonemTuruNorm(donem.donem_turu),
  )

  const sonuc = ayyHesapla({
    donemBas: donem.baslangic_tarihi,
    donemBit: donem.bitis_tarihi,
    izinler,
    tatiller,
    odBySiraNo,
    prevIzBySiraNo,
    prevPersonelIzOverflowBySicilNo,
    donemTuru: ayyDonemTuruNorm(donem.donem_turu),
    oncekiDonem: onceki
      ? {
          baslangic_tarihi: onceki.baslangic_tarihi,
          bitis_tarihi:     onceki.bitis_tarihi,
          kapatildi_at:     onceki.kapatildi_at ?? null,
        }
      : undefined,
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
      return vals.map((v) => ({ v, t: typeof v === 'number' ? 'n' : 's', s: kalinStil }))
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
