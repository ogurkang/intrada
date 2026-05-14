import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'
import { kesintimHesapla, type KesintimDonemRow, type KesintimIzinRow, type KesintimHesapSatir } from '@/lib/kesinym-hesap'
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

/** Base leaf record used throughout the route */
interface LeafRow {
  sira_no:  string
  sicil_no: string
  ad_soyad: string
  unvan:    string
  tip:      string
  tur:      string
  ayrilis:  string | null
  baslama:  string | null
  gun:      number
}

function sortle(arr: LeafRow[]) {
  const tipOrder: Record<string, number> = { rmy: 0, ivy: 1, izy: 2 }
  return [...arr].sort((a, b) => {
    const td = (tipOrder[a.tip] ?? 9) - (tipOrder[b.tip] ?? 9)
    if (td !== 0) return td
    const an = parseInt(a.sicil_no, 10), bn = parseInt(b.sicil_no, 10)
    return isNaN(an) || isNaN(bn) ? a.sicil_no.localeCompare(b.sicil_no, 'tr') : an - bn
  })
}

export async function GET(request: NextRequest) {
  const sp        = request.nextUrl.searchParams
  const donemIdP  = sp.get('donem_id')
  const tipParam  = sp.get('tip') ?? 'detay'      // 'detay' | 'ozet' | 'genel'
  const donemId   = parseInt(donemIdP ?? '0', 10)
  if (!donemId || isNaN(donemId)) {
    return NextResponse.json({ error: 'donem_id gerekli' }, { status: 400 })
  }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  /* ── Dönem bilgisi ─────────────────────────────────────────────── */
  const { data: donem } = await db
    .from('sosyal_hak_donem')
    .select('id, donem_adi, sira_no, baslangic_tarihi, bitis_tarihi')
    .eq('id', donemId)
    .single()
  if (!donem) return NextResponse.json({ error: 'Dönem bulunamadı' }, { status: 404 })

  const takvimGun  = Math.floor(
    (new Date(donem.bitis_tarihi).setHours(0, 0, 0, 0) - new Date(donem.baslangic_tarihi).setHours(0, 0, 0, 0)) / 86_400_000
  ) + 1
  const donemAdi   = donem.donem_adi ?? donem.sira_no ?? `Dönem #${donem.id}`
  const donemMetin = `Dönem: ${tarih(donem.baslangic_tarihi)} - ${tarih(donem.bitis_tarihi)} (${takvimGun} gün)`

  /* ── Seçimler ──────────────────────────────────────────────────── */
  const { data: secimRaw } = await db
    .from('sosyal_hak_secim')
    .select('izin_sira_no, tip')
    .eq('donem_id', donemId)
    .eq('dahil', true)
  const secimler = (secimRaw ?? []) as { izin_sira_no: string; tip: string }[]
  if (secimler.length === 0) {
    return NextResponse.json({ error: 'Döneme aktarılmış izin yok' }, { status: 404 })
  }
  const tipBySiraNo = new Map(secimler.map(s => [s.izin_sira_no, s.tip]))
  const siraNoList  = secimler.map(s => s.izin_sira_no)

  /* ── İzin verileri ─────────────────────────────────────────────── */
  const { data: izinRaw } = await supabase
    .from('izin_hareketleri')
    .select('sira_no, sicil_no, tur, ayrilis, baslama, gun')
    .in('sira_no', siraNoList)
    .neq('durum', 'İptal Edildi')

  const siciller = [...new Set((izinRaw ?? []).map(i => i.sicil_no).filter(Boolean))] as string[]
  const adMap:    Record<string, string> = {}
  const unvanMap: Record<string, string> = {}
  if (siciller.length > 0) {
    const { data: cal } = await supabase.from('calisan').select('sicil_no, ad_soyad').in('sicil_no', siciller)
    ;(cal ?? []).forEach(c => { if (c.sicil_no) adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no })
    const { data: kad } = await supabase.from('personel_kadro_ozet').select('sicil_no, kadro_unvani').in('sicil_no', siciller)
    ;(kad ?? []).forEach(k => { if (k.sicil_no) unvanMap[k.sicil_no] = k.kadro_unvani ?? '' })
  }

  const leafRows: LeafRow[] = (izinRaw ?? [])
    .filter(i => i.sira_no && i.ayrilis && i.baslama)
    .map(i => ({
      sira_no:  i.sira_no!,
      sicil_no: i.sicil_no ?? '',
      ad_soyad: adMap[i.sicil_no ?? ''] ?? i.sicil_no ?? '',
      unvan:    unvanMap[i.sicil_no ?? ''] ?? '',
      tip:      tipBySiraNo.get(i.sira_no!) ?? '',
      tur:      i.tur ?? '',
      ayrilis:  i.ayrilis,
      baslama:  i.baslama,
      gun:      i.gun ?? 0,
    }))

  /* ── IZY için kesintimHesapla ──────────────────────────────────── */
  const izySiraNoList = secimler.filter(s => s.tip === 'izy').map(s => s.izin_sira_no)
  let izySatirMap = new Map<string, KesintimHesapSatir>()

  if ((tipParam === 'ozet' || tipParam === 'genel') && izySiraNoList.length > 0) {
    const { data: tumDonemlerRaw } = await supabase
      .from('izinli_zabitalar_yeni_donem')
      .select('id, baslangic_tarihi, bitis_tarihi')
      .order('baslangic_tarihi', { ascending: true })
    const tumDonemler: KesintimDonemRow[] = (tumDonemlerRaw ?? []).map((d, i) => {
      const basMs = new Date(d.baslangic_tarihi).setHours(0, 0, 0, 0)
      const bitMs = new Date(d.bitis_tarihi).setHours(23, 59, 59, 999)
      const tg    = Math.floor((new Date(d.bitis_tarihi).setHours(0, 0, 0, 0) - new Date(d.baslangic_tarihi).setHours(0, 0, 0, 0)) / 86_400_000) + 1
      return { id: d.id, baslangic_tarihi: d.baslangic_tarihi, bitis_tarihi: d.bitis_tarihi, baslangic_tarihi_ms: basMs, bitis_tarihi_ms: bitMs, idx: i, takvimGun: tg, kapasite: tg }
    })
    const idxById = new Map(tumDonemler.map(d => [d.id, d.idx]))

    const { data: tumSecimRaw } = await supabase
      .from('izinli_zabitalar_yeni_secim')
      .select('donem_id, izin_sira_no, dahil')
    const ilkDonemIdBySiraNo: Record<string, number> = {}
    for (const s of tumSecimRaw ?? []) {
      if (!s.dahil || !s.izin_sira_no) continue
      if (s.donem_id === donemId) continue
      const idx  = idxById.get(s.donem_id) ?? 9999
      const prev = ilkDonemIdBySiraNo[s.izin_sira_no]
      if (prev === undefined || idx < (idxById.get(prev) ?? 9999)) {
        ilkDonemIdBySiraNo[s.izin_sira_no] = s.donem_id
      }
    }
    for (const sn of izySiraNoList) {
      ilkDonemIdBySiraNo[sn] = donemId
    }

    const izyIzinRows: KesintimIzinRow[] = leafRows
      .filter(r => r.tip === 'izy')
      .map(r => ({ sira_no: r.sira_no, sicil_no: r.sicil_no, ad_soyad: r.ad_soyad, unvan: r.unvan, tur: r.tur, ayrilis: r.ayrilis, baslama: r.baslama, gun: r.gun }))

    const { data: tatilRaw } = await supabase.from('tanim_izin_tatil').select('tatil_adi, tatil_turu, tatil_yapisi, tatil_baslangici, tatil_bitisi, durum').eq('durum', true)
    const tatiller = (tatilRaw ?? []).map(t => ({ tatil_adi: t.tatil_adi, tatil_turu: t.tatil_turu, tatil_yapisi: t.tatil_yapisi, tatil_baslangici: t.tatil_baslangici, tatil_bitisi: t.tatil_bitisi, durum: t.durum ?? true }))

    const sonuc = kesintimHesapla({ modul: 'izy', curId: donemId, donemler: tumDonemler, ilkDonemIdBySiraNo, izinler: izyIzinRows, tatiller })
    izySatirMap = new Map(sonuc.satirlar.map(s => [s.sira_no, s]))
  }

  /* ═══════════════════════════════════════════════════════════════
     DETAY Excel — per-leave records (Tip sütunu ile)
  ═══════════════════════════════════════════════════════════════ */
  if (tipParam === 'detay') {
    const satirlar = sortle(leafRows)
    const cols = ['Sıra No', 'Kayıt No', 'Sicil No', 'Adı Soyadı', 'Tip', 'Tür', 'Ayrılış', 'Başlama', 'Süre (Gün)']
    const colCount = cols.length
    const rows: (string | number | XLSX.CellObject)[][] = []
    const mergeRows: number[] = []

    rows.push(mergeSatir('Sosyal Hak Kesintileri — Dönem İçindeki İzinler', colCount, { bold: true }))
    mergeRows.push(rows.length - 1)
    rows.push(mergeSatir(donemAdi, colCount))
    mergeRows.push(rows.length - 1)
    rows.push(mergeSatir(donemMetin, colCount))
    mergeRows.push(rows.length - 1)
    rows.push(cols)

    if (satirlar.length === 0) {
      rows.push(Array(colCount).fill('').map((_, i) => (i === 3 ? 'Kayıt Yok' : '')))
    } else {
      satirlar.forEach((s, idx) => {
        rows.push([idx + 1, s.sira_no, s.sicil_no, s.ad_soyad, TIP_LABEL[s.tip] ?? s.tip, s.tur, tarih(s.ayrilis), tarih(s.baslama), s.gun])
      })
    }

    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!merges'] = mergeRows.map(r => ({ s: { r, c: 0 }, e: { r, c: colCount - 1 } }))
    ws['!cols']   = [{ wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 28 }, { wch: 18 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 10 }]
    applyGridBorders(ws, rows.length, colCount)

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Dönem İçindeki İzinler')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true })
    return xlsxResponse(buf, `Sosyal_Hak_Kesintileri_${donemAdi}_Detay`)
  }

  /* ═══════════════════════════════════════════════════════════════
     ÖZET Excel — per-person summary (IZY: Rapor Bakiyesi dahil)
  ═══════════════════════════════════════════════════════════════ */
  if (tipParam === 'ozet') {
    const ozetCols  = ['Sıra No', 'Sicil No', 'Ad Soyad', 'Unvan', 'Önceki Dönemden', 'İzin Süresi', 'Rap. Bakiyesi', 'Kesilen', 'Sonraki Döneme']
    const colCount  = ozetCols.length
    const rows: (string | number | XLSX.CellObject)[][] = []
    const mergeRows: number[] = []

    rows.push(mergeSatir('Sosyal Hak Kesintileri — Genel Özet', colCount, { bold: true }))
    mergeRows.push(rows.length - 1)
    rows.push(mergeSatir(donemAdi, colCount))
    mergeRows.push(rows.length - 1)
    rows.push(mergeSatir(donemMetin, colCount))
    mergeRows.push(rows.length - 1)

    const tipSirasi: ('rmy' | 'ivy' | 'izy')[] = ['rmy', 'ivy', 'izy']
    for (const tip of tipSirasi) {
      const tipRows = leafRows.filter(r => r.tip === tip)
      if (tipRows.length === 0) continue

      // Tip bölüm başlığı
      rows.push(mergeSatir(TIP_LABEL[tip] ?? tip, colCount, { gri: true }))
      mergeRows.push(rows.length - 1)
      rows.push(ozetCols)

      if (tip === 'izy') {
        // IZY: kesintimHesapla'dan gelen kişi özetleri
        // kisiOzetTopla zaten satirlar içinde; personel listesini satirlardan türet
        type P = { sicil_no: string; ad_soyad: string; unvan: string; OD: number; IZ: number; RB: number; K: number; SD: number }
        const pMap = new Map<string, P>()
        for (const s of izySatirMap.values()) {
          const ex = pMap.get(s.sicil_no)
          if (!ex) {
            pMap.set(s.sicil_no, { sicil_no: s.sicil_no, ad_soyad: s.ad_soyad, unvan: s.unvan, OD: s.OD, IZ: s.R + s.RR + s.HR, RB: s.RB, K: s.K, SD: s.SD })
          } else {
            ex.OD += s.OD; ex.IZ += s.R + s.RR + s.HR
            ex.K  += s.K;  ex.SD += s.SD
            if (s.RB > ex.RB) ex.RB = s.RB
          }
        }
        const pArr = [...pMap.values()].sort((a, b) => {
          const na = parseInt(a.sicil_no), nb = parseInt(b.sicil_no)
          return isNaN(na) || isNaN(nb) ? a.sicil_no.localeCompare(b.sicil_no, 'tr') : na - nb
        })
        if (pArr.length === 0) {
          rows.push(Array(colCount).fill('').map((_, i) => i === 2 ? 'Kayıt Yok' : ''))
        } else {
          pArr.forEach((p, idx) => {
            rows.push([idx + 1, p.sicil_no, p.ad_soyad, p.unvan, p.OD, p.IZ, p.RB || '', p.K, p.SD])
          })
        }
      } else {
        // RMY / IVY: basit kişi bazında toplam
        type Bp = { sicil_no: string; ad_soyad: string; unvan: string; gun: number }
        const bMap = new Map<string, Bp>()
        for (const r of tipRows) {
          const ex = bMap.get(r.sicil_no)
          if (!ex) bMap.set(r.sicil_no, { sicil_no: r.sicil_no, ad_soyad: r.ad_soyad, unvan: r.unvan, gun: r.gun })
          else ex.gun += r.gun
        }
        const bArr = [...bMap.values()].sort((a, b) => {
          const na = parseInt(a.sicil_no), nb = parseInt(b.sicil_no)
          return isNaN(na) || isNaN(nb) ? a.sicil_no.localeCompare(b.sicil_no, 'tr') : na - nb
        })
        bArr.forEach((p, idx) => {
          rows.push([idx + 1, p.sicil_no, p.ad_soyad, p.unvan, '', p.gun, '', '', ''])
        })
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!merges'] = mergeRows.map(r => ({ s: { r, c: 0 }, e: { r, c: colCount - 1 } }))
    ws['!cols']   = [{ wch: 8 }, { wch: 10 }, { wch: 26 }, { wch: 20 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 16 }]
    applyGridBorders(ws, rows.length, colCount)

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Özet')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true })
    return xlsxResponse(buf, `Sosyal_Hak_Kesintileri_${donemAdi}_Ozet`)
  }

  /* ═══════════════════════════════════════════════════════════════
     GENEL Excel — per-leave rows + özet hesap sütunları birleşik
     Sütun sırası: ..., Ayrılış, Başlama, Süre  →  ÖD, İZ, RB, K, SD
  ═══════════════════════════════════════════════════════════════ */
  const genelCols = [
    'Sıra No', 'Kayıt No', 'Sicil No', 'Adı Soyadı', 'Tip', 'Tür',
    'Ayrılış', 'Başlama', 'Süre (Gün)',
    'Önceki Dönemden', 'İzin Süresi', 'Rapor Bakiyesi', 'Kesilen', 'Sonraki Döneme',
  ]
  const colCount = genelCols.length
  const rows: (string | number | XLSX.CellObject)[][] = []
  const mergeRows: number[] = []

  rows.push(mergeSatir('Sosyal Hak Kesintileri — Genel', colCount, { bold: true }))
  mergeRows.push(rows.length - 1)
  rows.push(mergeSatir(donemAdi, colCount))
  mergeRows.push(rows.length - 1)
  rows.push(mergeSatir(donemMetin, colCount))
  mergeRows.push(rows.length - 1)

  const tipSirasi: ('rmy' | 'ivy' | 'izy')[] = ['rmy', 'ivy', 'izy']
  for (const tip of tipSirasi) {
    const tipRows = sortle(leafRows.filter(r => r.tip === tip))
    if (tipRows.length === 0) continue

    rows.push(mergeSatir(TIP_LABEL[tip] ?? tip, colCount, { gri: true }))
    mergeRows.push(rows.length - 1)
    rows.push(genelCols)

    tipRows.forEach((s, idx) => {
      let od: string | number = ''
      let iz: string | number = ''
      let rb: string | number = ''
      let k:  string | number = ''
      let sd: string | number = ''

      if (tip === 'izy') {
        const hs = izySatirMap.get(s.sira_no)
        if (hs) {
          od = hs.OD
          iz = hs.R + hs.RR + hs.HR
          rb = hs.RB || ''
          k  = hs.K
          sd = hs.SD
        }
      }

      rows.push([idx + 1, s.sira_no, s.sicil_no, s.ad_soyad, TIP_LABEL[s.tip] ?? s.tip, s.tur, tarih(s.ayrilis), tarih(s.baslama), s.gun, od, iz, rb, k, sd])
    })
  }

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!merges'] = mergeRows.map(r => ({ s: { r, c: 0 }, e: { r, c: colCount - 1 } }))
  ws['!cols'] = [
    { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 26 }, { wch: 18 }, { wch: 20 },
    { wch: 12 }, { wch: 12 }, { wch: 10 },
    { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 16 },
  ]
  applyGridBorders(ws, rows.length, colCount)

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Genel')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true })
  return xlsxResponse(buf, `Sosyal_Hak_Kesintileri_${donemAdi}_Genel`)
}

function xlsxResponse(buf: Buffer, name: string) {
  const safeName      = name.replace(/[:\*\?\/\\]/g, ' ').trim().substring(0, 90) || 'Sosyal_Hak'
  const fallbackName  = safeName.replace(/[^\x20-\x7E]/g, '_')
  const encodedName   = encodeURIComponent(`${safeName}.xlsx`)
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fallbackName}.xlsx"; filename*=UTF-8''${encodedName}`,
    },
  })
}
