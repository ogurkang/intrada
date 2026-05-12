import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'
import { kesintimHesapla, type KesintimDonemRow, type KesintimIzinRow } from '@/lib/kesinym-hesap'
import { applyGridBorders, mergeSatir } from '@/lib/kesintiler-excel'

function tarih(t: string | null) {
  if (!t) return '—'
  return new Date(t).toLocaleDateString('tr-TR')
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const donemIdParam = searchParams.get('donem_id')
  const tip = searchParams.get('tip') ?? 'detay'
  const donemId = parseInt(donemIdParam ?? '0', 10)
  if (!donemId || isNaN(donemId)) {
    return NextResponse.json({ error: 'donem_id gerekli' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: donem } = await supabase
    .from('izinli_zabitalar_yeni_donem')
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

  /* ── Ortak veri yükleme ─────────────────────────────────────────── */
  const { data: tumDonemlerRaw } = await supabase
    .from('izinli_zabitalar_yeni_donem')
    .select('id, baslangic_tarihi, bitis_tarihi')
    .order('baslangic_tarihi', { ascending: true })
  const tumDonemler: KesintimDonemRow[] = (tumDonemlerRaw ?? []).map((d, i) => {
    const basMs = new Date(d.baslangic_tarihi).setHours(0, 0, 0, 0)
    const bitMs = new Date(d.bitis_tarihi).setHours(23, 59, 59, 999)
    const tg = Math.floor((new Date(d.bitis_tarihi).setHours(0, 0, 0, 0) - new Date(d.baslangic_tarihi).setHours(0, 0, 0, 0)) / 86_400_000) + 1
    return {
      id: d.id,
      baslangic_tarihi: d.baslangic_tarihi,
      bitis_tarihi: d.bitis_tarihi,
      baslangic_tarihi_ms: basMs,
      bitis_tarihi_ms: bitMs,
      idx: i,
      takvimGun: tg,
      kapasite: tg,
    }
  })
  const idxById = new Map(tumDonemler.map(d => [d.id, d.idx]))

  const { data: tumSecimRaw } = await supabase
    .from('izinli_zabitalar_yeni_secim')
    .select('donem_id, izin_sira_no, dahil')
  const ilkDonemIdBySiraNo: Record<string, number> = {}
  for (const s of tumSecimRaw ?? []) {
    if (!s.dahil || !s.izin_sira_no) continue
    if (s.donem_id === donemId) continue
    const idx = idxById.get(s.donem_id) ?? 9999
    const prev = ilkDonemIdBySiraNo[s.izin_sira_no]
    if (prev === undefined || idx < (idxById.get(prev) ?? 9999)) {
      ilkDonemIdBySiraNo[s.izin_sira_no] = s.donem_id
    }
  }
  const { data: buDonemSecim } = await supabase
    .from('izinli_zabitalar_yeni_secim')
    .select('izin_sira_no, dahil')
    .eq('donem_id', donemId)
  for (const s of buDonemSecim ?? []) {
    if (s.dahil && s.izin_sira_no) {
      ilkDonemIdBySiraNo[s.izin_sira_no] = donemId
    }
  }

  const siraNoList = Object.keys(ilkDonemIdBySiraNo)
  let izinler: KesintimIzinRow[] = []
  if (siraNoList.length > 0) {
    const { data: izinRaw } = await supabase
      .from('izin_hareketleri')
      .select('sira_no, sicil_no, tur, ayrilis, baslama, gun')
      .in('sira_no', siraNoList)
      .neq('durum', 'İptal Edildi')
    const siciller = [...new Set((izinRaw ?? []).map(i => i.sicil_no).filter(Boolean))] as string[]
    const adMap: Record<string, string> = {}
    const unvanMap: Record<string, string> = {}
    if (siciller.length > 0) {
      const { data: calisanlar } = await supabase.from('calisan').select('sicil_no, ad_soyad').in('sicil_no', siciller)
      ;(calisanlar ?? []).forEach(c => { if (c.sicil_no) adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no })
      const { data: kadroRaw } = await supabase.from('personel_kadro_ozet').select('sicil_no, kadro_unvani').in('sicil_no', siciller)
      ;(kadroRaw ?? []).forEach(k => { if (k.sicil_no) unvanMap[k.sicil_no] = k.kadro_unvani ?? '' })
    }
    izinler = (izinRaw ?? [])
      .filter(iz => iz.sira_no && iz.ayrilis && iz.baslama)
      .map(iz => ({
        sira_no: iz.sira_no!,
        sicil_no: iz.sicil_no ?? '',
        ad_soyad: adMap[iz.sicil_no] ?? iz.sicil_no ?? '',
        unvan: unvanMap[iz.sicil_no] ?? '',
        tur: iz.tur ?? '',
        ayrilis: iz.ayrilis,
        baslama: iz.baslama,
        gun: iz.gun ?? 0,
      }))
  }

  const { data: tatilRaw } = await supabase.from('tanim_izin_tatil').select('tatil_adi, tatil_turu, tatil_yapisi, tatil_baslangici, tatil_bitisi, durum').eq('durum', true)
  const tatiller = (tatilRaw ?? []).map(t => ({ tatil_adi: t.tatil_adi, tatil_turu: t.tatil_turu, tatil_yapisi: t.tatil_yapisi, tatil_baslangici: t.tatil_baslangici, tatil_bitisi: t.tatil_bitisi, durum: t.durum ?? true }))
  const sonuc = kesintimHesapla({ modul: 'izy', curId: donemId, donemler: tumDonemler, ilkDonemIdBySiraNo, izinler, tatiller })
  const izinBySiraNo = new Map(izinler.map(i => [i.sira_no, i]))

  /* ── Detay tipi: bu dönemin izinleri — izin başına satır ────────── */
  if (tip === 'detay') {
    const detaySatirlar = sonuc.satirlar
      .sort((a, b) => {
        const an = parseInt(a.sicil_no, 10)
        const bn = parseInt(b.sicil_no, 10)
        return isNaN(an) || isNaN(bn) ? a.sicil_no.localeCompare(b.sicil_no, 'tr') : an - bn
      })

    const detayHeaders = ['Sıra No', 'Kayıt No', 'Sicil No', 'Adı Soyadı', 'Tür', 'Ayrılış', 'Başlama', 'Süre']
    const colCount = detayHeaders.length
    const rows: (string | number | XLSX.CellObject)[][] = []
    const mergeRows: number[] = []

    rows.push(mergeSatir('İzinli Zabıtalar — Dönem İçindeki İzinler', colCount, { bold: true }))
    mergeRows.push(rows.length - 1)
    rows.push(mergeSatir(donemMetin, colCount))
    mergeRows.push(rows.length - 1)
    rows.push(detayHeaders)

    if (detaySatirlar.length === 0) {
      rows.push(Array(colCount).fill('').map((_, i) => (i === 2 ? 'Kayıt Yok' : '')))
    } else {
      detaySatirlar.forEach((s, i) => {
        const izin = izinBySiraNo.get(s.sira_no)
        rows.push([i + 1, s.sira_no, s.sicil_no, s.ad_soyad, s.tur, tarih(izin?.ayrilis ?? null), tarih(izin?.baslama ?? null), izin?.gun ?? 0])
      })
    }

    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!merges'] = mergeRows.map(r => ({ s: { r, c: 0 }, e: { r, c: colCount - 1 } }))
    ws['!cols'] = [{ wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 26 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 10 }]
    applyGridBorders(ws, rows.length, colCount)

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Dönem İçindeki İzinler')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true })

    const safeName = (`Izinli_Zabitalar_Detay_${donem.donem_adi ?? 'Donem'}`).replace(/[:\*\?\/\\]/g, ' ').trim().substring(0, 90) || 'Izinli_Zabitalar_Detay'
    const fallbackName = safeName.replace(/[^\x20-\x7E]/g, '_')
    const encodedFilename = encodeURIComponent(`${safeName}.xlsx`)
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fallbackName}.xlsx"; filename*=UTF-8''${encodedFilename}`,
      },
    })
  }

  /* ── Özet tipi ──────────────────────────────────────────────────── */
  const headers = ['Sıra No', 'Sicil No', 'Ad Soyad', 'Unvan', 'Önceki Dönemden', 'İzin Süresi', 'Rap. Bakiyesi', 'Kesilen', 'Sonraki Döneme']
  const colCount = headers.length

  function satir(p: { seq: number; sicil_no: string; ad_soyad: string; unvan: string; OD: number; IZ: number; RB: number; K: number; SD: number }) {
    return [p.seq, p.sicil_no, p.ad_soyad, p.unvan, p.OD, p.IZ, p.RB || '', p.K, p.SD]
  }

  const rows: (string | number | XLSX.CellObject)[][] = []
  const mergeRows: number[] = []
  const bosSatir = Array(colCount).fill('')

  rows.push(mergeSatir('İzinli Zabıtalar — Genel Özet', colCount))
  mergeRows.push(rows.length - 1)
  rows.push(mergeSatir(donemMetin, colCount))
  mergeRows.push(rows.length - 1)
  rows.push(headers)
  if (sonuc.personeller.length === 0) {
    rows.push(['', '', 'Kayıt Yok', ...bosSatir.slice(4)])
  } else {
    sonuc.personeller.forEach(p => rows.push(satir(p)))
  }

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!merges'] = mergeRows.map(r => ({ s: { r, c: 0 }, e: { r, c: colCount - 1 } }))
  applyGridBorders(ws, rows.length, colCount)

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Izinli Zabitalar')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true })

  const safeName = (`Izinli_Zabitalar_Ozet_${donem.donem_adi ?? 'Donem'}`).replace(/[:\*\?\/\\]/g, ' ').trim().substring(0, 90) || 'Izinli_Zabitalar_Ozet'
  const fallbackName = safeName.replace(/[^\x20-\x7E]/g, '_')
  const encodedFilename = encodeURIComponent(`${safeName}.xlsx`)

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fallbackName}.xlsx"; filename*=UTF-8''${encodedFilename}`,
    },
  })
}
