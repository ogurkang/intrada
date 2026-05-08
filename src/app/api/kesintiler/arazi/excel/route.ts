import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'
import { assertKullaniciMudurlukFromSession } from '@/lib/kullanici-mudurluk'
import { applyBordersToRows, applyGridBordersRange, imzaMergeler, imzaSatiri, mergeSatir } from '@/lib/kesintiler-excel'
import { buildTurAdiToKodMap, PUANTAJ_KOD_ACIKLAMA } from '@/lib/izin-puantaj-kodu'
import { izinKodlariBySicilGunFromHareketler } from '@/lib/arazi-izin-gunleri'
import { haftaSonuIzinHucreKodu } from '@/lib/puantaj-hafta-sonu-izin'

function tarih(t: string | null) {
  if (!t) return '—'
  return new Date(t).toLocaleDateString('tr-TR')
}

/** Yerel takvim günü YYYY-MM-DD (toISOString UTC kayması yok; TR sunucu/istemci uyumu) */
function tarihYerelISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const g = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${g}`
}

const AYLAR_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

// Dönemdeki ayları al (max 3)
function donemAylari(baslangic: string, bitis: string): { yil: number; ay: number; ayAdi: string }[] {
  const aylar: { yil: number; ay: number; ayAdi: string }[] = []
  const d = new Date(baslangic)
  const son = new Date(bitis)
  const seen = new Set<string>()
  while (d <= son && aylar.length < 3) {
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (!seen.has(key)) {
      seen.add(key)
      aylar.push({
        yil: d.getFullYear(),
        ay: d.getMonth(),
        ayAdi: `${AYLAR_TR[d.getMonth()]}.${String(d.getFullYear()).slice(2)}`,
      })
    }
    d.setMonth(d.getMonth() + 1)
    d.setDate(1)
  }
  return aylar
}

function donemIcerisinde(dateStr: string, baslangic: string, bitis: string): boolean {
  return dateStr >= baslangic && dateStr <= bitis
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
  tatiller: Array<{ tatil_baslangici: string | null; tatil_bitisi: string | null; tatil_yapisi?: string | null }>,
  baslangic: string,
  bitis: string,
) {
  const yillar = yilAraligi(baslangic, bitis)
  return tatiller.flatMap(t => {
    const bas = String(t.tatil_baslangici ?? '').slice(0, 10)
    const son = String(t.tatil_bitisi ?? '').slice(0, 10)
    if (!bas || !son) return []
    const yapi = String(t.tatil_yapisi ?? '').trim()
    if (yapi !== 'Sabit Tatil') return [{ baslangic: bas, bitis: son }]
    const mmddBas = bas.slice(5, 10)
    const mmddSon = son.slice(5, 10)
    return yillar.map(y => ({ baslangic: `${y}-${mmddBas}`, bitis: `${y}-${mmddSon}` }))
  })
}

// HT=Gri, B=Turuncu; diğer tüm kodlar (X, S, R, …) açık yeşil
const RENK_HT = 'E0E0E0'
const RENK_B = 'FFE4CC'
const RENK_X = 'CCE5FF'
const RENK_YESIL = 'E8F5E9'

function kodRenk(kod: string): string | undefined {
  if (!kod) return undefined
  if (kod === 'HT') return RENK_HT
  if (kod === 'B') return RENK_B
  if (kod === 'X') return RENK_X
  return RENK_YESIL
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const donemIdParam = searchParams.get('donem_id')
    const mudurluk = searchParams.get('mudurluk') ?? ''
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

    const { data: donemRow, error: donemErr } = await supabase
      .from('arazi_donem')
      .select('id, donem_adi, baslangic_tarihi, bitis_tarihi')
      .eq('id', donemId)
      .single()

    if (donemErr || !donemRow) {
      return NextResponse.json({ error: 'Dönem bulunamadı' }, { status: 404 })
    }

    const donem = donemRow
    const aylar = donemAylari(donem.baslangic_tarihi, donem.bitis_tarihi)

    const { data: unvanRaw } = await supabase
      .from('tanim_unvan')
      .select('unvan_adi, kat_sayi')
      .eq('arazi', true)
      .eq('aktif', true)

    const unvanOranMap: Record<string, number> = {}
    ;(unvanRaw ?? []).forEach(u => {
      if (u.unvan_adi) unvanOranMap[u.unvan_adi] = Number(u.kat_sayi ?? 0) || 0
    })
    const araziUnvanlar = Object.keys(unvanOranMap)

    let personeller: { sicil_no: string; ad_soyad: string; mudurluk: string; oran: number; statu: string | null }[] = []
    if (araziUnvanlar.length > 0) {
      const { data: kadroRaw } = await supabase
        .from('kadro_hareketleri')
        .select('asil, kadro_unvani, gorev_mudurlugu, kadro_mudurlugu, statu')
        .is('ayrilis_tarihi', null)
        .in('kadro_unvani', araziUnvanlar)
        .not('asil', 'is', null)

      const mudurlukFiltre = mudurluk
        ? (k: { gorev_mudurlugu?: string | null; kadro_mudurlugu?: string | null }) =>
            (k.gorev_mudurlugu ?? k.kadro_mudurlugu ?? '') === mudurluk
        : () => true

      const kadroFiltre = (kadroRaw ?? []).filter(mudurlukFiltre)
      const sicilNolar = [...new Set(kadroFiltre.map(k => k.asil).filter(Boolean))] as string[]

      if (sicilNolar.length > 0) {
        const { data: calisanRaw } = await supabase
          .from('calisan')
          .select('sicil_no, ad_soyad')
          .in('sicil_no', sicilNolar)

        const adMap: Record<string, string> = {}
        ;(calisanRaw ?? []).forEach(c => {
          if (c.sicil_no) adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no
        })

        const mudMap: Record<string, string> = {}
        const oranMap: Record<string, number> = {}
        const statuMap: Record<string, string> = {}
        kadroFiltre.forEach(k => {
          if (k.asil) {
            mudMap[k.asil] = k.gorev_mudurlugu ?? k.kadro_mudurlugu ?? ''
            oranMap[k.asil] = unvanOranMap[k.kadro_unvani ?? ''] ?? 0
            if (k.statu) statuMap[k.asil] = String(k.statu).trim()
          }
        })

        personeller = sicilNolar
          .map(s => ({
            sicil_no: s,
            ad_soyad: adMap[s] ?? s,
            mudurluk: mudMap[s] ?? '',
            oran: oranMap[s] ?? 0,
            statu: statuMap[s] ?? null,
          }))
          .sort((a, b) => {
            if (a.oran !== b.oran) return a.oran - b.oran
            return String(a.sicil_no).localeCompare(String(b.sicil_no), 'tr')
          })
      }
    }

    const { data: tatilRaw } = await supabase
      .from('tanim_izin_tatil')
      .select('tatil_baslangici, tatil_bitisi, tatil_yapisi')
      .eq('durum', true)

    const tatilSet = new Set<string>()
    tatilleriDonemeUydur(tatilRaw ?? [], donem.baslangic_tarihi, donem.bitis_tarihi)
      .filter(t => t.baslangic <= donem.bitis_tarihi && t.bitis >= donem.baslangic_tarihi)
      .forEach(t => {
      const d = new Date(t.baslangic)
      const son = new Date(t.bitis)
      while (d <= son) {
        tatilSet.add(tarihYerelISO(d))
        d.setDate(d.getDate() + 1)
      }
    })

    const { data: kayitRaw } = await supabase
      .from('arazi_kayit')
      .select('sicil_no, tarih')
      .eq('donem_id', donemId)

    const markedSet = new Set<string>((kayitRaw ?? []).map(k => `${k.sicil_no}:${k.tarih}`))

    const { data: izinTurRaw } = await supabase
      .from('tanim_izin_tur')
      .select('tur_adi, kod')
      .eq('durum', true)
    const turAdiToKod = buildTurAdiToKodMap(izinTurRaw ?? [])
    const sicilExcel = personeller.map(p => p.sicil_no)
    let izinKodlariBySicilGun: Record<string, Record<string, string>> = {}
    if (sicilExcel.length > 0) {
      const { data: izinRaw } = await supabase
        .from('izin_hareketleri')
        .select('sicil_no, baslama, ayrilis, tur, durum')
        .in('sicil_no', sicilExcel)
        .neq('durum', 'İptal Edildi')
        .lte('ayrilis', donem.bitis_tarihi)
        .gt('baslama', donem.baslangic_tarihi)
      izinKodlariBySicilGun = izinKodlariBySicilGunFromHareketler(
        izinRaw ?? [],
        String(donem.baslangic_tarihi).slice(0, 10),
        String(donem.bitis_tarihi).slice(0, 10),
        turAdiToKod,
      )
    }

    const imzaSiciller = [puantorSicil, birimAmiriSicil, mudurSicil].filter(Boolean)
    let imzaAdMap: Record<string, string> = {}
    if (imzaSiciller.length > 0) {
      const { data: imzaCal } = await supabase.from('calisan').select('sicil_no, ad_soyad').in('sicil_no', imzaSiciller)
      ;(imzaCal ?? []).forEach(c => { if (c.sicil_no) imzaAdMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no })
    }
    const imzaAdlar: [string, string, string] = [
      puantorSicil ? (imzaAdMap[puantorSicil] ?? puantorSicil) : '',
      birimAmiriSicil ? (imzaAdMap[birimAmiriSicil] ?? birimAmiriSicil) : '',
      mudurSicil ? (imzaAdMap[mudurSicil] ?? mudurSicil) : '',
    ]

    const colCount = 3 + 1 + 31 + 4 // Sıra, Sicil, Ad Soyad, Ay, 31 gün, Aylık Gün, Üç Aylık Gün, Oran, Toplam (A:AM)
    const rows: (string | number | XLSX.CellObject)[][] = []
    const mergeRows: number[] = []
    const mergesPersonel: XLSX.Range[] = []

    rows.push(mergeSatir('T.C.', colCount))
    mergeRows.push(rows.length - 1)
    rows.push(mergeSatir('ADAPAZARI BELEDİYESİ', colCount))
    mergeRows.push(rows.length - 1)
    rows.push(mergeSatir(mudurluk || 'Tüm Müdürlükler', colCount))
    mergeRows.push(rows.length - 1)
    rows.push(mergeSatir('ARAZİ TAZMİNATI PUANTAJI', colCount))
    mergeRows.push(rows.length - 1)
    rows.push(mergeSatir('', colCount))
    mergeRows.push(rows.length - 1)
    rows.push(mergeSatir(`Dönem: ${tarih(donem.baslangic_tarihi)} - ${tarih(donem.bitis_tarihi)}`, colCount, { gri: true }))
    mergeRows.push(rows.length - 1)
    rows.push(mergeSatir(PUANTAJ_KOD_ACIKLAMA, colCount, { dolguYok: true }))
    mergeRows.push(rows.length - 1)

    const headerLabels = [
      'Sıra No',
      'Sicil No',
      'Adı Soyadı',
      'Ay',
      ...Array.from({ length: 31 }, (_, i) => String(i + 1)),
      'Aylık Gün',
      'Üç Aylık Gün',
      'Oran',
      'Toplam',
    ]
    const headerStil = {
      fill: { fgColor: { rgb: 'E0E0E0' } },
      alignment: { horizontal: 'center' as const, vertical: 'center' as const, wrapText: true },
      font: { bold: true },
    }
    rows.push(headerLabels.map(v => ({ v: String(v), t: 's' as const, s: headerStil })))

    const headerRowIdx = rows.length - 1
    const borderRows = new Set<number>()
    borderRows.add(headerRowIdx)

    const dataStil = {
      alignment: { horizontal: 'center' as const, vertical: 'center' as const, wrapText: true },
    }

    const statuBySicil: Record<string, string | null> = {}
    for (const p of personeller) statuBySicil[p.sicil_no] = p.statu

    function gunKoduGetir(sicil_no: string, yil: number, ay: number, gun: number): string {
      const d = new Date(yil, ay, gun)
      if (d.getDate() !== gun || d.getMonth() !== ay) return ''
      const iso = tarihYerelISO(d)
      if (!donemIcerisinde(iso, donem.baslangic_tarihi, donem.bitis_tarihi)) return ''
      const hGunu = d.getDay()
      const hafSonu = hGunu === 0 || hGunu === 6
      const izinKodRaw = izinKodlariBySicilGun[sicil_no]?.[iso]
      const statu = statuBySicil[sicil_no]

      if (tatilSet.has(iso)) return 'B'
      if (izinKodRaw) {
        if (hafSonu) {
          const goster = haftaSonuIzinHucreKodu({
            statu,
            izinKodu: izinKodRaw,
            haftaGunu: hGunu,
          })
          return goster ?? 'HT'
        }
        return izinKodRaw
      }
      if (hafSonu) return 'HT'
      return markedSet.has(`${sicil_no}:${iso}`) ? 'X' : ''
    }

    function aylikSayiGetir(sicil_no: string, ay: { yil: number; ay: number }): number {
      let say = 0
      for (let g = 1; g <= 31; g++) {
        const d = new Date(ay.yil, ay.ay, g)
        if (d.getDate() !== g || d.getMonth() !== ay.ay) continue
        const iso = tarihYerelISO(d)
        if (donemIcerisinde(iso, donem.baslangic_tarihi, donem.bitis_tarihi) && markedSet.has(`${sicil_no}:${iso}`))
          say++
      }
      return say
    }

    function uctoplamGetir(sicil_no: string): number {
      let say = 0
      aylar.forEach(ay => {
        for (let g = 1; g <= 31; g++) {
          const d = new Date(ay.yil, ay.ay, g)
          if (d.getDate() !== g || d.getMonth() !== ay.ay) continue
          const iso = tarihYerelISO(d)
          if (donemIcerisinde(iso, donem.baslangic_tarihi, donem.bitis_tarihi) && markedSet.has(`${sicil_no}:${iso}`))
            say++
        }
      })
      return say
    }

    personeller.forEach((p, pIdx) => {
      const uctoplam = uctoplamGetir(p.sicil_no)
      const toplamDeger = uctoplam * (p.oran || 0)
      const firstDataRow = rows.length

      aylar.forEach((ay, ayIdx) => {
        const aylikGun = aylikSayiGetir(p.sicil_no, ay)
        const gunDegerler = Array.from({ length: 31 }, (_, i) => {
          const gun = i + 1
          return gunKoduGetir(p.sicil_no, ay.yil, ay.ay, gun)
        })

        const row: (string | number | XLSX.CellObject)[] = []

        if (ayIdx === 0) {
          row.push({ v: pIdx + 1, t: 'n' as const, s: dataStil })
          row.push({ v: p.sicil_no, t: 's' as const, s: dataStil })
          row.push({ v: p.ad_soyad, t: 's' as const, s: dataStil })
        } else {
          row.push('')
          row.push('')
          row.push('')
        }

        row.push({ v: ay.ayAdi, t: 's' as const, s: dataStil })

        gunDegerler.forEach(kod => {
          const fillRgb = kodRenk(kod)
          const stil = { ...dataStil, ...(fillRgb ? { fill: { fgColor: { rgb: fillRgb } } } : {}) }
          row.push({ v: kod, t: 's' as const, s: stil })
        })

        row.push({ v: aylikGun, t: 'n' as const, s: dataStil })

        if (ayIdx === 0) {
          const oranStr = (p.oran || 0).toString().replace('.', ',')
          row.push({ v: uctoplam, t: 'n' as const, s: dataStil })
          row.push({ v: oranStr, t: 's' as const, s: dataStil })
          row.push({ v: toplamDeger.toFixed(2).replace('.', ','), t: 's' as const, s: dataStil })
        } else {
          row.push('')
          row.push('')
          row.push('')
        }

        rows.push(row)
        borderRows.add(rows.length - 1)
      })

      if (aylar.length > 1) {
        mergesPersonel.push(
          { s: { r: firstDataRow, c: 0 }, e: { r: firstDataRow + aylar.length - 1, c: 0 } },
          { s: { r: firstDataRow, c: 1 }, e: { r: firstDataRow + aylar.length - 1, c: 1 } },
          { s: { r: firstDataRow, c: 2 }, e: { r: firstDataRow + aylar.length - 1, c: 2 } },
          { s: { r: firstDataRow, c: 36 }, e: { r: firstDataRow + aylar.length - 1, c: 36 } },
          { s: { r: firstDataRow, c: 37 }, e: { r: firstDataRow + aylar.length - 1, c: 37 } },
          { s: { r: firstDataRow, c: 38 }, e: { r: firstDataRow + aylar.length - 1, c: 38 } },
        )
      }
    })

    const lastDataRow = rows.length - 1
    for (let i = 0; i < 8; i++) {
      rows.push(mergeSatir('', colCount))
      mergeRows.push(rows.length - 1)
    }

    const imzaLabelsR = rows.length
    rows.push(imzaSatiri(colCount, ['PUANTÖR', 'BİRİM AMİRİ', 'MÜDÜR'], true))
    const imzaNamesR = rows.length
    const dataStilImza = { alignment: { horizontal: 'center' as const, vertical: 'center' as const, wrapText: true } }
    const imzaNamesRow: (string | XLSX.CellObject)[] = []
    for (let i = 0; i < colCount; i++) {
      if (i === 0) imzaNamesRow.push({ v: imzaAdlar[0], t: 's' as const, s: dataStilImza })
      else if (i === 13) imzaNamesRow.push({ v: imzaAdlar[1], t: 's' as const, s: dataStilImza })
      else if (i === 26) imzaNamesRow.push({ v: imzaAdlar[2], t: 's' as const, s: dataStilImza })
      else imzaNamesRow.push({ v: '', t: 's' as const, s: dataStilImza })
    }
    rows.push(imzaNamesRow)

    const ws = XLSX.utils.aoa_to_sheet(rows)
    applyGridBordersRange(ws, headerRowIdx, lastDataRow, colCount)
    applyBordersToRows(ws, borderRows, colCount, rows.length - 1)

    // Merge aralıkları: Puantör A-M, Birim Amiri N:Z, Müdür AA:AM
    const merges: XLSX.Range[] = [
      ...mergeRows.map(r => ({ s: { r, c: 0 }, e: { r, c: colCount - 1 } })),
      ...mergesPersonel,
      ...imzaMergeler(imzaLabelsR, colCount),
      { s: { r: imzaNamesR, c: 0 }, e: { r: imzaNamesR, c: 12 } },   // Puantör A-M
      { s: { r: imzaNamesR, c: 13 }, e: { r: imzaNamesR, c: 25 } },   // Birim Amiri N:Z
      { s: { r: imzaNamesR, c: 26 }, e: { r: imzaNamesR, c: colCount - 1 } }, // Müdür AA:AM
    ]
    ws['!merges'] = merges

    ws['!cols'] = [
      { wch: 8 },
      { wch: 10 },
      { wch: 22 },
      { wch: 8 },
      ...Array(31).fill({ wch: 3 }),
      { wch: 10 },
      { wch: 12 },
      { wch: 8 },
      { wch: 10 },
    ]

    ws['!pageSetup'] = {
      orientation: 'landscape',
      paperSize: 9,
      fitToWidth: 1,
      fitToHeight: 0,
    }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Arazi Puantaj')

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true })
    const mudurlukAdi = mudurluk || 'Tum_Mudurlukler'
    const filename = `Arazi_Puantaj_${donem.donem_adi ?? 'Donem'}_${mudurlukAdi.replace(/[:\*\?\/\\]/g, ' ')}.xlsx`
    const encodedFilename = encodeURIComponent(filename)
    const fallbackName = 'Arazi_Puantaj_Raporu.xlsx'
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodedFilename}`,
      },
    })
  } catch (err) {
    console.error('ARAZI_EXCEL_API_HATASI: ', err)
    return NextResponse.json({ error: 'Excel oluşturulamadı' }, { status: 500 })
  }
}
