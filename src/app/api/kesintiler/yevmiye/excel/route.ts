import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'
import { assertKullaniciMudurlukFromSession } from '@/lib/kullanici-mudurluk'
import { applyBordersToRows, imzaMergelerSecili, imzaSatiriSecili, mergeSatir, type ImzaRol } from '@/lib/kesintiler-excel'
import { buildTurAdiToKodMap } from '@/lib/izin-puantaj-kodu'
import { izinKodlariBySicilGunFromHareketler } from '@/lib/arazi-izin-gunleri'
import { haftaSonuIzinHucreKodu } from '@/lib/puantaj-hafta-sonu-izin'

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

function yilAraligi(baslangic: string, bitis: string): number[] {
  const b = new Date(baslangic)
  const s = new Date(bitis)
  if (isNaN(b.getTime()) || isNaN(s.getTime())) return []
  const yillar: number[] = []
  for (let y = b.getFullYear(); y <= s.getFullYear(); y++) yillar.push(y)
  return yillar
}

function tatilleriDonemeUydur(
  tatiller: Array<{ tatil_baslangici: string | null; tatil_bitisi: string | null; tatil_turu?: string | null; tatil_adi?: string | null; tatil_yapisi?: string | null }>,
  baslangic: string,
  bitis: string,
) {
  const yillar = yilAraligi(baslangic, bitis)
  return tatiller.flatMap(t => {
    const bas = String(t.tatil_baslangici ?? '').slice(0, 10)
    const son = String(t.tatil_bitisi ?? '').slice(0, 10)
    if (!bas || !son) return []
    const yapi = String(t.tatil_yapisi ?? '').trim()
    if (yapi !== 'Sabit Tatil') {
      return [{ baslangic: bas, bitis: son, tatil_turu: t.tatil_turu, tatil_adi: t.tatil_adi }]
    }
    const mmddBas = bas.slice(5, 10)
    const mmddSon = son.slice(5, 10)
    return yillar.map(y => ({
      baslangic: `${y}-${mmddBas}`,
      bitis: `${y}-${mmddSon}`,
      tatil_turu: t.tatil_turu,
      tatil_adi: t.tatil_adi,
    }))
  })
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
    .select('tatil_baslangici, tatil_bitisi, tatil_turu, tatil_adi, tatil_yapisi')
    .eq('durum', true)

  const tatilRanges: { baslangic: Date; bitis: Date; kod: string }[] = []
  const tatiller = tatilleriDonemeUydur(tatilRaw ?? [], baslangic, bitis)
    .filter(t => t.baslangic <= bitis && t.bitis >= baslangic)
  tatiller.forEach(t => {
    const b = tarihParse(t.baslangic)
    const e = tarihParse(t.bitis)
    if (!b || !e) return
    const tur = String(t.tatil_turu ?? '').trim().toLocaleLowerCase('tr-TR')
    tatilRanges.push({ baslangic: b, bitis: e, kod: tur.includes('bayram') ? 'B' : 'RT' })
  })

  const { data: izinTurRaw } = await supabase
    .from('tanim_izin_tur')
    .select('tur_adi, kod')
    .eq('durum', true)
  const turAdiToKod = buildTurAdiToKodMap(izinTurRaw ?? [])

  const { data: izinRaw } = await supabase
    .from('izin_hareketleri')
    .select('sicil_no, tur, ayrilis, baslama, durum')
    .neq('durum', 'İptal Edildi')
    .lte('ayrilis', bitis)
    .gt('baslama', baslangic)
  const izinKodlariBySicilGun = izinKodlariBySicilGunFromHareketler(
    izinRaw ?? [],
    String(baslangic).slice(0, 10),
    String(bitis).slice(0, 10),
    turAdiToKod,
  )

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
        const dow = new Date(`${g.tarih}T12:00:00`).getDay()
        const izinKodRaw = izinKodlariBySicilGun[p.sicil]?.[g.tarih]
        if (g.isResmiTatil && g.tatilKod) {
          deger = g.tatilKod
        } else if (izinKodRaw) {
          if (g.isHaftaTatil) {
            const goster = haftaSonuIzinHucreKodu({
              statu: p.statu,
              izinKodu: izinKodRaw,
              haftaGunu: dow,
            })
            deger = goster ?? 'HT'
          } else {
            deger = izinKodRaw
          }
        } else if (g.isHaftaTatil) {
          deger = 'HT'
        } else {
          deger = 'X'
        }
      }
      grid[p.sicil][g.tarih] = deger
      if (savedFmForSicil[g.tarih] != null) fazlaMesaiGrid[p.sicil][g.tarih] = savedFmForSicil[g.tarih]
    }
  }

  const personellerOzet = personeller.map(p => {
    const gridAgg = grid[p.sicil] ?? {}
    const fmAgg = fazlaMesaiGrid[p.sicil] ?? {}
    let gunX = 0, gunHT = 0, gunB = 0, fmNor = 0, fmBay = 0, izinS = 0, izinUI = 0, izinU = 0, izinIst = 0
    for (const g of gunler) {
      const deg = gridAgg[g.tarih] ?? ''
      if (deg === 'X' || deg === 'x') gunX++
      else if (deg === 'HT') gunHT++
      else if (deg === 'B') gunB++
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
      gunB,
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
    const imzaRoller: ImzaRol[] = []
    if (puantorSicil) {
      imzaRoller.push({ etiket: 'PUANTÖR', ad: imzaAdMap[puantorSicil] ?? puantorSicil })
    }
    if (birimAmiriSicil) {
      imzaRoller.push({ etiket: 'BİRİM AMİRİ', ad: imzaAdMap[birimAmiriSicil] ?? birimAmiriSicil })
    }
    if (mudurSicil) {
      imzaRoller.push({ etiket: 'MÜDÜR', ad: imzaAdMap[mudurSicil] ?? mudurSicil })
    }

    const colCount = 3 + gunler.length + 10
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

    const headerLabels = ['Sıra No', 'Sicil No', 'Adı Soyadı', ...gunler.map(g => String(g.gun)), 'N.Ç.', 'H.T.', 'FM NOR.', 'FM BAY.', 'FM YTOP', 'S.İZİN', 'Üİ İZİN', 'Ü.İZİN', 'İST.', 'B']
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
        ? [p.siraNo, p.sicil_no, p.ad_soyad, ...gunKodlar, p.gunX, p.gunHT, '', p.fmBay, '', p.izinS, p.izinUI, p.izinU, p.izinIst, p.gunB]
        : [p.siraNo, p.sicil_no, p.ad_soyad, ...gunKodlar, p.gunX, p.gunHT, p.fmNor, p.fmBay, fmYtop.toFixed(1), p.izinS, p.izinUI, p.izinU, p.izinIst, p.gunB]
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
        const fmRow = ['', '', '', ...gunFm, '', '', p.fmNor, '', fmYtop.toFixed(1), '', '', '', '', '']
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

    let imzaLabelsR: number | null = null
    let imzaNamesR: number | null = null
    if (imzaRoller.length > 0) {
      imzaLabelsR = rows.length
      rows.push(imzaSatiriSecili(colCount, imzaRoller, 'etiket', true))
      imzaNamesR = rows.length
      rows.push(imzaSatiriSecili(colCount, imzaRoller, 'ad', false))
    }

    const ws = XLSX.utils.aoa_to_sheet(rows)
    const merges: XLSX.Range[] = [
      ...mergeRows.map(r => ({ s: { r, c: 0 }, e: { r, c: colCount - 1 } })),
    ]
    if (imzaLabelsR != null) merges.push(...imzaMergelerSecili(imzaLabelsR, colCount, imzaRoller.length))
    if (imzaNamesR != null) merges.push(...imzaMergelerSecili(imzaNamesR, colCount, imzaRoller.length))

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
