import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'
import { assertKullaniciMudurlukFromSession } from '@/lib/kullanici-mudurluk'
import { applyBordersToRows, imzaMergeler, imzaSatiri, mergeSatir } from '@/lib/kesintiler-excel'

const GUNLER_TR = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']

function tarih(t: string | null) {
  if (!t) return '—'
  return new Date(t).toLocaleDateString('tr-TR')
}

function tarihParse(str: string): Date | null {
  if (!str || typeof str !== 'string') return null
  const d = new Date(str.trim())
  return isNaN(d.getTime()) ? null : d
}

function toISO(d: Date): string {
  return d.toISOString().split('T')[0]
}

function gunlerUret(baslangic: string, bitis: string) {
  const result: { tarih: string; gun: number; isHaftaTatil: boolean; isResmiTatil: boolean; tatilKod: string }[] = []
  const d = new Date(baslangic)
  const son = new Date(bitis)
  while (d <= son) {
    const gun = d.getDay()
    result.push({
      tarih: toISO(d),
      gun: d.getDate(),
      isHaftaTatil: gun === 0 || gun === 6,
      isResmiTatil: false,
      tatilKod: '',
    })
    d.setDate(d.getDate() + 1)
  }
  return result
}

/** API Route için doğrudan Supabase ile veri çekme (Server Action kullanılmaz) */
async function yevmiyeExcelVeriCek(donemId: number, mudurluk: string, statu: string) {
  const supabase = await createClient()

  const { data: donemRow, error: donemErr } = await supabase
    .from('yevmiye_donem')
    .select('id, donem_adi, baslangic_tarihi, bitis_tarihi')
    .eq('id', donemId)
    .single()

  if (donemErr || !donemRow) return { hata: 'Dönem bulunamadı.', data: null }

  const baslangic = donemRow.baslangic_tarihi
  const bitis = donemRow.bitis_tarihi

  const { data: tatilRaw } = await supabase
    .from('tanim_izin_tatil')
    .select('tatil_baslangici, tatil_bitisi, tatil_turu, tatil_adi')
    .eq('durum', true)
    .lte('tatil_baslangici', bitis)
    .gte('tatil_bitisi', baslangic)

  const tatilRanges: { baslangic: Date; bitis: Date; kod: string }[] = []
  ;(tatilRaw ?? []).forEach(t => {
    if (!t.tatil_baslangici || !t.tatil_bitisi) return
    const b = tarihParse(t.tatil_baslangici)
    const e = tarihParse(t.tatil_bitisi)
    if (!b || !e) return
    const tur = String(t.tatil_turu ?? '').trim()
    const adi = String(t.tatil_adi ?? '').trim()
    tatilRanges.push({ baslangic: b, bitis: e, kod: tur === 'Bayram' || adi.includes('Bayram') ? 'B' : 'RT' })
  })

  const { data: izinTurRaw } = await supabase
    .from('tanim_izin_tur')
    .select('tur_adi, kod')
    .eq('durum', true)
  const turAdiToKod: Record<string, string> = {}
  ;(izinTurRaw ?? []).forEach(t => {
    const ad = String(t.tur_adi ?? '').trim()
    const kod = String(t.kod ?? '').trim()
    if (ad) turAdiToKod[ad] = kod || (ad.includes('Yıllık') ? 'S' : ad.includes('Rapor') ? 'R' : ad.includes('Ücretsiz') ? 'Ü' : ad.includes('Ücretli') ? 'Üİ' : ad.includes('Ölüm') ? 'Öİ' : 'S')
  })

  const { data: izinRaw } = await supabase
    .from('izin_hareketleri')
    .select('sicil_no, tur, ayrilis, baslama')
    .neq('durum', 'Taslak')
    .neq('durum', 'İptal Edildi')
    .lte('baslama', bitis)
    .gte('ayrilis', baslangic)

  const izinHareketleri: { sicil: string; ayrilis: number; baslama: number; kod: string }[] = []
  ;(izinRaw ?? []).forEach(i => {
    const a = tarihParse(i.ayrilis ?? '')
    const b = tarihParse(i.baslama ?? '')
    if (!a || !b) return
    const tur = String(i.tur ?? '').trim()
    const kod = turAdiToKod[tur] ?? (tur.includes('Yıllık') ? 'S' : tur.includes('Rapor') ? 'R' : tur.includes('Ücretsiz') ? 'Ü' : tur.includes('Ücretli') ? 'Üİ' : tur.includes('Ölüm') ? 'Öİ' : 'S')
    izinHareketleri.push({
      sicil: String(i.sicil_no ?? '').trim(),
      ayrilis: a.getTime(),
      baslama: b.getTime(),
      kod,
    })
  })

  const { data: kadroRaw } = await supabase
    .from('kadro_hareketleri')
    .select('asil, vekil, statu, gorev_mudurlugu, kadro_mudurlugu')
    .is('ayrilis_tarihi', null)
    .in('statu', ['Sözleşmeli', 'İşçi'])

  const personelByMud: { sicil: string; adSoyad: string; statu: string }[] = []
  const seen = new Set<string>()
  const calisanMap: Record<string, string> = {}

  for (const k of kadroRaw ?? []) {
    const statuVal = String(k.statu ?? '').trim()
    if (statuVal !== 'Sözleşmeli' && statuVal !== 'İşçi') continue
    const gorevMud = String(k.gorev_mudurlugu ?? k.kadro_mudurlugu ?? '').trim()
    if (gorevMud !== mudurluk) continue
    for (const sicil of [k.asil, k.vekil].filter(Boolean) as string[]) {
      if (!sicil || seen.has(sicil)) continue
      seen.add(sicil)
      personelByMud.push({ sicil, adSoyad: sicil, statu: statuVal })
    }
  }

  const siciller = personelByMud.map(p => p.sicil).filter(Boolean)
  if (siciller.length > 0) {
    const { data: cal } = await supabase.from('calisan').select('sicil_no, ad_soyad').in('sicil_no', siciller)
    ;(cal ?? []).forEach(c => { if (c.sicil_no) calisanMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no })
  }
  personelByMud.forEach(p => { p.adSoyad = calisanMap[p.sicil] ?? p.sicil })

  const personeller = personelByMud
    .filter(p => p.statu === statu)
    .sort((a, b) => (a.adSoyad || '').localeCompare(b.adSoyad || '', 'tr'))
  personeller.forEach((p, i) => { (p as { siraNo?: number }).siraNo = i + 1 })

  const gunlerHam = gunlerUret(baslangic, bitis)
  const gunler = gunlerHam.map(g => {
    const d = tarihParse(g.tarih)!
    let tatilKod = g.tatilKod
    let isResmiTatil = g.isResmiTatil
    for (const t of tatilRanges) {
      if (d >= t.baslangic && d <= t.bitis) {
        tatilKod = t.kod
        isResmiTatil = true
        break
      }
    }
    return {
      tarih: g.tarih,
      gun: g.gun,
      gunAdi: GUNLER_TR[d.getDay()],
      isHaftaTatil: g.isHaftaTatil,
      isResmiTatil,
      tatilKod,
    }
  })

  const { data: kayitRaw } = await supabase
    .from('yevmiye_puantaj_kayit')
    .select('sicil_no, tarih, deger, fazla_mesai_saat')
    .eq('donem_id', donemId)
    .eq('mudurluk', mudurluk)

  const savedGrid: Record<string, Record<string, string>> = {}
  const savedFazlaMesai: Record<string, Record<string, number>> = {}
  ;(kayitRaw ?? []).forEach(k => {
    const sicil = String(k.sicil_no ?? '').trim()
    const tarihStr = String(k.tarih ?? '').slice(0, 10)
    if (!savedGrid[sicil]) savedGrid[sicil] = {}
    if (k.deger) savedGrid[sicil][tarihStr] = k.deger
    const fm = (k.fazla_mesai_saat ?? 0) > 0 ? Number(k.fazla_mesai_saat) : 0
    if (fm > 0) {
      if (!savedFazlaMesai[sicil]) savedFazlaMesai[sicil] = {}
      savedFazlaMesai[sicil][tarihStr] = fm
    }
  })

  const grid: Record<string, Record<string, string>> = {}
  const fazlaMesaiGrid: Record<string, Record<string, number>> = {}

  for (const p of personeller) {
    grid[p.sicil] = {}
    fazlaMesaiGrid[p.sicil] = {}
    const savedForSicil = savedGrid[p.sicil] ?? {}
    const savedFmForSicil = savedFazlaMesai[p.sicil] ?? {}
    for (const g of gunler) {
      let deger: string
      if (savedForSicil[g.tarih] !== undefined && savedForSicil[g.tarih] !== '') {
        deger = savedForSicil[g.tarih]
      } else {
        deger = g.isHaftaTatil ? 'HT' : g.isResmiTatil && g.tatilKod ? g.tatilKod : 'X'
        const tarihT = tarihParse(g.tarih)!.getTime()
        for (const ih of izinHareketleri) {
          if (ih.sicil !== p.sicil) continue
          if (tarihT >= ih.ayrilis && tarihT <= ih.baslama) {
            deger = ih.kod || 'S'
            break
          }
        }
      }
      grid[p.sicil][g.tarih] = deger
      if (savedFmForSicil[g.tarih] != null) fazlaMesaiGrid[p.sicil][g.tarih] = savedFmForSicil[g.tarih]
    }
  }

  const personellerOzet = personeller.map(p => {
    const gridAgg = grid[p.sicil] ?? {}
    const fmAgg = fazlaMesaiGrid[p.sicil] ?? {}
    let gunX = 0, gunHT = 0, fmNor = 0, fmBay = 0, izinS = 0, izinUI = 0, izinU = 0, izinIst = 0
    for (const g of gunler) {
      const deg = gridAgg[g.tarih] ?? ''
      if (deg === 'X' || deg === 'x') gunX++
      else if (deg === 'HT') gunHT++
      else if (deg === 'S') izinS++
      else if (deg === 'Üİ') izinUI++
      else if (deg === 'Ü') izinU++
      else if (deg === 'R') izinIst++
      const fmVal = fmAgg[g.tarih] ?? 0
      if (fmVal > 0) {
        if (deg === 'X' || deg === 'x' || deg === 'HT') fmNor += fmVal
        else if (deg === 'B') fmBay += fmVal
      }
    }
    return {
      sicil_no: p.sicil,
      ad_soyad: p.adSoyad,
      statu: p.statu,
      siraNo: (p as { siraNo?: number }).siraNo ?? 0,
      gunX,
      gunHT,
      fmNor: Math.round(fmNor * 100) / 100,
      fmBay: Math.round(fmBay * 100) / 100,
      izinS,
      izinUI,
      izinU,
      izinIst,
    }
  })

  return {
    hata: null,
    data: {
      donem: { donem_adi: donemRow.donem_adi, baslangic_tarihi: baslangic, bitis_tarihi: bitis },
      mudurlukAdi: mudurluk,
      personeller: personellerOzet,
      gunler,
      grid,
      fazlaMesaiGrid,
    },
  }
}

const LEGEND = 'HT=Hafta tatili, B=Bayram, R=Rapor, RR=Refakatçı Raporu, HR=Heyet Raporu, Öİ=Ölüm İzni, Eİ=Evlilik İzni, Bİ=Babalık İzni, MEİ=Mehil İzni, Mİ=Mazeret İzni, İİ=İdari İzin, DÖÇ=Doğum Öncesi Çalışamaz, DSÇ=Doğum Sonrası Çalışamaz'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const donemIdParam = searchParams.get('donem_id')
    const mudurluk = searchParams.get('mudurluk') ?? ''
    const statu = searchParams.get('statu') ?? 'Sözleşmeli'
    const puantorSicil = searchParams.get('puantor') ?? searchParams.get('puantorSicil') ?? ''
    const birimAmiriSicil = searchParams.get('birim_amiri') ?? searchParams.get('birimAmiri') ?? ''
    const mudurSicil = searchParams.get('mudur') ?? searchParams.get('mudurSicil') ?? ''
    const donemId = parseInt(donemIdParam ?? '0', 10)
    if (!donemId || isNaN(donemId)) {
      return NextResponse.json({ error: 'donem_id gerekli' }, { status: 400 })
    }

    const supabase = await createClient()
    const mudKontrol = await assertKullaniciMudurlukFromSession(supabase, mudurluk)
    if (!mudKontrol.ok) {
      return NextResponse.json({ error: mudKontrol.mesaj }, { status: mudKontrol.status })
    }

    const res = await yevmiyeExcelVeriCek(donemId, mudurluk, statu)
    if (res.hata || !res.data) {
      return NextResponse.json({ error: res.hata ?? 'Veri yüklenemedi' }, { status: 404 })
    }

    const { donem, mudurlukAdi, personeller, gunler, grid, fazlaMesaiGrid } = res.data

    const imzaSiciller = [puantorSicil, birimAmiriSicil, mudurSicil].filter(Boolean)
    let imzaAdMap: Record<string, string> = {}
    if (imzaSiciller.length > 0) {
      const { data: imzaCal } = await supabase.from('calisan').select('sicil_no, ad_soyad').in('sicil_no', imzaSiciller)
      ;(imzaCal ?? []).forEach(c => {
        if (c.sicil_no) imzaAdMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no
      })
    }
    const imzaAdlar: [string, string, string] = [
      puantorSicil ? (imzaAdMap[puantorSicil] ?? puantorSicil) : '',
      birimAmiriSicil ? (imzaAdMap[birimAmiriSicil] ?? birimAmiriSicil) : '',
      mudurSicil ? (imzaAdMap[mudurSicil] ?? mudurSicil) : '',
    ]

    const colCount = 3 + gunler.length + 9
    const rows: (string | number | XLSX.CellObject)[][] = []
    const mergeRows: number[] = []

    rows.push(mergeSatir('T.C.', colCount))
    mergeRows.push(rows.length - 1)
    rows.push(mergeSatir('ADAPAZARI BELEDİYESİ', colCount))
    mergeRows.push(rows.length - 1)
    rows.push(mergeSatir(mudurlukAdi, colCount))
    mergeRows.push(rows.length - 1)
    rows.push(mergeSatir(statu === 'Sözleşmeli' ? 'SÖZLEŞMELİ PUANTAJ ÇİZELGESİ' : 'İŞÇİ PUANTAJ ÇİZELGESİ', colCount))
    mergeRows.push(rows.length - 1)
    rows.push(mergeSatir('', colCount))
    mergeRows.push(rows.length - 1)
    rows.push(mergeSatir(`Dönem: ${tarih(donem.baslangic_tarihi)} - ${tarih(donem.bitis_tarihi)}`, colCount, { gri: true }))
    mergeRows.push(rows.length - 1)

    const headerLabels = ['Sıra No', 'Sicil No', 'Adı Soyadı', ...gunler.map(g => String(g.gun)), 'N.Ç.', 'H.T.', 'FM NOR.', 'FM BAY.', 'FM YTOP', 'S.İZİN', 'Üİ İZİN', 'Ü.İZİN', 'İST.']
    const headerStil = { fill: { fgColor: { rgb: 'E0E0E0' } }, alignment: { horizontal: 'center' as const, vertical: 'center' as const, wrapText: true }, font: { bold: true } }
    rows.push(headerLabels.map(v => ({ v: String(v), t: 's' as const, s: headerStil })))

    const isIscı = statu === 'İşçi'
    const borderRows = new Set<number>()
    borderRows.add(5)
    borderRows.add(6)

    const dataStil = { alignment: { horizontal: 'center' as const, vertical: 'center' as const, wrapText: true } }
    const kodRenk = (kod: string) => {
      const k = String(kod ?? '').trim()
      if (k === 'HT') return { fgColor: { rgb: 'E0E0E0' } }
      if (k === 'B') return { fgColor: { rgb: 'FFE4CC' } }
      if (k !== 'X' && k !== 'x' && k !== '—' && k !== '') return { fgColor: { rgb: 'CCE5FF' } }
      return undefined
    }

    for (const p of personeller) {
      const gunKodlar = gunler.map(g => grid[p.sicil_no]?.[g.tarih] ?? '—')
      const fmYtop = gunler.reduce((s, g) => s + (fazlaMesaiGrid[p.sicil_no]?.[g.tarih] ?? 0), 0)
      const kodRow = isIscı
        ? [p.siraNo, p.sicil_no, p.ad_soyad, ...gunKodlar, p.gunX, p.gunHT, '', p.fmBay, '', p.izinS, p.izinUI, p.izinU, p.izinIst]
        : [p.siraNo, p.sicil_no, p.ad_soyad, ...gunKodlar, p.gunX, p.gunHT, p.fmNor, p.fmBay, fmYtop.toFixed(1), p.izinS, p.izinUI, p.izinU, p.izinIst]
      rows.push(kodRow.map((v, colIdx) => {
        const fill = colIdx >= 3 && colIdx < 3 + gunler.length ? kodRenk(String(v)) : undefined
        const stil = fill ? { ...dataStil, fill } : dataStil
        return { v, t: typeof v === 'number' ? ('n' as const) : ('s' as const), s: stil }
      }))
      borderRows.add(rows.length - 1)

      if (isIscı) {
        const gunFm = gunler.map(g => {
          const fm = fazlaMesaiGrid[p.sicil_no]?.[g.tarih] ?? 0
          return fm > 0 ? fm : ''
        })
        const fmRow = ['', '', '', ...gunFm, '', '', p.fmNor, '', fmYtop.toFixed(1), '', '', '', '']
        rows.push(fmRow.map(v => ({ v: v || '', t: typeof v === 'number' ? ('n' as const) : ('s' as const), s: dataStil })))
        borderRows.add(rows.length - 1)
      }
    }

    rows.push(mergeSatir(LEGEND, colCount))
    mergeRows.push(rows.length - 1)
    for (let i = 0; i < 8; i++) {
      rows.push(mergeSatir('', colCount))
      mergeRows.push(rows.length - 1)
    }

    const imzaLabelsR = rows.length
    rows.push(imzaSatiri(colCount, ['PUANTÖR', 'BİRİM AMİRİ', 'MÜDÜR'], true))
    const imzaNamesR = rows.length
    rows.push(imzaSatiri(colCount, imzaAdlar, false))

    const ws = XLSX.utils.aoa_to_sheet(rows)
    const merges: XLSX.Range[] = [
      ...mergeRows.map(r => ({ s: { r, c: 0 }, e: { r, c: colCount - 1 } })),
      ...imzaMergeler(imzaLabelsR, colCount),
      ...imzaMergeler(imzaNamesR, colCount),
    ]

    let personRowIdx = 7
    for (const _p of personeller) {
      const kodR = personRowIdx
      personRowIdx++
      if (isIscı) {
        const fmR = personRowIdx
        personRowIdx++
        merges.push({ s: { r: kodR, c: 0 }, e: { r: fmR, c: 0 } })
        merges.push({ s: { r: kodR, c: 1 }, e: { r: fmR, c: 1 } })
        merges.push({ s: { r: kodR, c: 2 }, e: { r: fmR, c: 2 } })
      }
    }

    ws['!merges'] = merges
    applyBordersToRows(ws, borderRows, colCount, rows.length - 1)

    ws['!cols'] = [
      { wch: 8 },
      { wch: 10 },
      { wch: 22 },
      ...gunler.map(() => ({ wch: 3 })),
      { wch: 6 },
      { wch: 6 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 6 },
      { wch: 6 },
      { wch: 6 },
      { wch: 6 },
    ]

    ws['!pageSetup'] = {
      orientation: 'landscape',
      paperSize: 9,
      fitToWidth: 1,
      fitToHeight: 0,
    }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Yevmiye Puantaj')

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const filename = `Yevmiye_Puantaj_${donem.donem_adi ?? 'Donem'}_${mudurlukAdi.replace(/[:\*\?\/\\]/g, ' ')}.xlsx`
    const encodedFilename = encodeURIComponent(filename)
    // Fallback isminde asla Türkçe karakter olmamalı!
    const fallbackName = 'Yevmiye_Puantaj_Raporu.xlsx'
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodedFilename}`,
      },
    })
  } catch (err) {
    console.error('EXCEL_API_HATASI: ', err)
    return NextResponse.json({ error: 'Excel oluşturulamadı' }, { status: 500 })
  }
}
