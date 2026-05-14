import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'
import { applyGridBorders, mergeSatir } from '@/lib/kesintiler-excel'

function tarih(t: string | null | undefined) {
  if (!t) return '—'
  return new Date(t).toLocaleDateString('tr-TR')
}

const TIP_LABEL: Record<string, string> = {
  rmy: 'Raporlu Memur',
  ivy: 'İzinli Vekil',
  izy: 'İzinli Zabıta',
}

export async function GET(request: NextRequest) {
  const donemIdParam = request.nextUrl.searchParams.get('donem_id')
  const tipParam = request.nextUrl.searchParams.get('tip') ?? 'detay' // 'ozet' | 'detay'
  const donemId = parseInt(donemIdParam ?? '0', 10)
  if (!donemId || isNaN(donemId)) {
    return NextResponse.json({ error: 'donem_id gerekli' }, { status: 400 })
  }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // Dönem bilgisi
  const { data: donem } = await db
    .from('sosyal_hak_donem')
    .select('id, donem_adi, sira_no, baslangic_tarihi, bitis_tarihi')
    .eq('id', donemId)
    .single()
  if (!donem) {
    return NextResponse.json({ error: 'Dönem bulunamadı' }, { status: 404 })
  }

  // Bu döneme aktarılmış seçimler
  const { data: secimRaw } = await db
    .from('sosyal_hak_secim')
    .select('izin_sira_no, tip')
    .eq('donem_id', donemId)
    .eq('dahil', true)

  const secimler = (secimRaw ?? []) as { izin_sira_no: string; tip: string }[]
  const tipBySiraNo = new Map(secimler.map(s => [s.izin_sira_no, s.tip]))

  if (secimler.length === 0) {
    return NextResponse.json({ error: 'Döneme aktarılmış izin yok' }, { status: 404 })
  }

  const siraNoList = secimler.map(s => s.izin_sira_no)

  // İzin detayları
  const { data: izinRaw } = await supabase
    .from('izin_hareketleri')
    .select('sira_no, sicil_no, tur, ayrilis, baslama, gun')
    .in('sira_no', siraNoList)
    .neq('durum', 'İptal Edildi')

  // Çalışan adları
  const siciller = [...new Set((izinRaw ?? []).map(i => i.sicil_no).filter(Boolean))] as string[]
  const adMap: Record<string, string> = {}
  if (siciller.length > 0) {
    const { data: calisanlar } = await supabase
      .from('calisan')
      .select('sicil_no, ad_soyad')
      .in('sicil_no', siciller)
    ;(calisanlar ?? []).forEach(c => { if (c.sicil_no) adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no })
  }

  // Satırları oluştur ve sırala: tip → sicil_no
  type Satir = { sira_no: string; sicil_no: string; ad_soyad: string; tip: string; tur: string; ayrilis: string | null; baslama: string | null; gun: number }
  const satirlar: Satir[] = (izinRaw ?? [])
    .filter(i => i.sira_no && i.ayrilis && i.baslama)
    .map(i => ({
      sira_no:  i.sira_no!,
      sicil_no: i.sicil_no ?? '',
      ad_soyad: adMap[i.sicil_no ?? ''] ?? i.sicil_no ?? '',
      tip:      tipBySiraNo.get(i.sira_no!) ?? '',
      tur:      i.tur ?? '',
      ayrilis:  i.ayrilis,
      baslama:  i.baslama,
      gun:      i.gun ?? 0,
    }))
    .sort((a, b) => {
      const tipFark = (TIP_LABEL[a.tip] ?? a.tip).localeCompare(TIP_LABEL[b.tip] ?? b.tip, 'tr')
      if (tipFark !== 0) return tipFark
      const an = parseInt(a.sicil_no, 10)
      const bn = parseInt(b.sicil_no, 10)
      return isNaN(an) || isNaN(bn) ? a.sicil_no.localeCompare(b.sicil_no, 'tr') : an - bn
    })

  // Excel
  const takvimGun = Math.floor(
    (new Date(donem.bitis_tarihi).setHours(0, 0, 0, 0) - new Date(donem.baslangic_tarihi).setHours(0, 0, 0, 0)) / 86_400_000
  ) + 1
  const donemAdi  = donem.donem_adi ?? donem.sira_no ?? `Dönem #${donem.id}`
  const donemMetin = `Dönem: ${tarih(donem.baslangic_tarihi)} - ${tarih(donem.bitis_tarihi)} (${takvimGun} gün)`

  const headers = ['Sıra No', 'Kayıt No', 'Sicil No', 'Adı Soyadı', 'Tip', 'Tür', 'Ayrılış', 'Başlama', 'Süre (Gün)']
  const colCount = headers.length
  const rows: (string | number | XLSX.CellObject)[][] = []
  const mergeRows: number[] = []

  rows.push(mergeSatir('Sosyal Hak Kesintileri — Döneme Aktarılan İzinler', colCount, { bold: true }))
  mergeRows.push(rows.length - 1)
  rows.push(mergeSatir(donemAdi, colCount))
  mergeRows.push(rows.length - 1)
  rows.push(mergeSatir(donemMetin, colCount))
  mergeRows.push(rows.length - 1)
  rows.push(headers)

  if (satirlar.length === 0) {
    rows.push(Array(colCount).fill('').map((_, i) => (i === 3 ? 'Kayıt Yok' : '')))
  } else {
    satirlar.forEach((s, idx) => {
      rows.push([
        idx + 1,
        s.sira_no,
        s.sicil_no,
        s.ad_soyad,
        TIP_LABEL[s.tip] ?? s.tip,
        s.tur,
        tarih(s.ayrilis),
        tarih(s.baslama),
        s.gun,
      ])
    })
  }

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!merges'] = mergeRows.map(r => ({ s: { r, c: 0 }, e: { r, c: colCount - 1 } }))
  ws['!cols'] = [
    { wch: 8 },
    { wch: 10 },
    { wch: 10 },
    { wch: 28 },
    { wch: 18 },
    { wch: 20 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
  ]
  applyGridBorders(ws, rows.length, colCount)

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Döneme Aktarılan İzinler')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true })

  const tipSuffix = tipParam === 'ozet' ? '_Ozet' : '_Detay'
  const safeName = `Sosyal_Hak_Kesintileri_${donemAdi}${tipSuffix}`.replace(/[:\*\?\/\\]/g, ' ').trim().substring(0, 90) || 'Sosyal_Hak_Kesintileri'
  const fallbackName = safeName.replace(/[^\x20-\x7E]/g, '_')
  const encodedFilename = encodeURIComponent(`${safeName}.xlsx`)

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fallbackName}.xlsx"; filename*=UTF-8''${encodedFilename}`,
    },
  })
}
