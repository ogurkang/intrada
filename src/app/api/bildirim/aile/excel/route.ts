import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'
import { applyGridBorders } from '@/lib/kesintiler-excel'
import path from 'path'
import fs from 'fs'

interface Cocuk {
  ad_soyad?: string
  tckn?: string
  dogum_tarihi?: string
  cinsiyet?: string
  baba_adi?: string
  ana_adi?: string
}

function tarihFormatla(t: string | null | undefined) {
  if (!t) return ''
  try { return new Date(t).toLocaleDateString('tr-TR') } catch { return String(t) }
}

function cinsiyetGoster(c: string | null | undefined) {
  if (!c) return ''
  if (c === 'E' || c === 'Erkek') return 'E'
  if (c === 'K' || c === 'Kız' || c === 'Kadın') return 'K'
  return c
}

function hucreYaz(ws: XLSX.WorkSheet, adres: string, deger: string) {
  const cell = ws[adres]
  const mevcutStil = cell?.s || {}
  ws[adres] = { v: deger, t: 's' as const, s: mevcutStil }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const idParam = searchParams.get('id')
    const id = parseInt(idParam ?? '0', 10)
    if (!id || isNaN(id)) {
      return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: kayit, error } = await supabase
      .from('aile_bildirimi')
      .select('*, calisan(ad_soyad, tckn)')
      .eq('id', id)
      .single()

    if (error || !kayit) {
      return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 })
    }

    const cal = kayit.calisan as { ad_soyad?: string | null; tckn?: string | null } | null
    const adSoyad = cal?.ad_soyad ?? null
    const personelTckn = cal?.tckn ?? ''

    let gorevMudurlugu = ''
    let gorevUnvani = ''
    const { data: khList } = await supabase
      .from('kadro_hareketleri')
      .select('gorev_mudurlugu, kadro_mudurlugu, gorev_unvani, kadro_unvani')
      .or(`asil.eq.${kayit.sicil_no},vekil.eq.${kayit.sicil_no}`)
      .is('ayrilis_tarihi', null)
      .limit(1)
    if (khList && khList.length > 0) {
      const kh = khList[0] as { gorev_mudurlugu?: string; kadro_mudurlugu?: string; gorev_unvani?: string; kadro_unvani?: string }
      gorevMudurlugu = kh.gorev_mudurlugu ?? kh.kadro_mudurlugu ?? ''
      gorevUnvani = kh.gorev_unvani ?? kh.kadro_unvani ?? ''
    }

    const cocuklar = (Array.isArray(kayit.cocuklar_json) ? kayit.cocuklar_json : []) as Cocuk[]
    const kayitTarihi = tarihFormatla(kayit.kayit_zamani)

    const templatePath = path.join(process.cwd(), 'public', 'templates', 'aile_durumu_bildirimi.xlsx')

    if (fs.existsSync(templatePath)) {
      const buf = fs.readFileSync(templatePath)
      const wb = XLSX.read(buf, { type: 'buffer', cellStyles: true })
      const sheetName = wb.SheetNames[0] ?? 'Sayfa1'
      const ws = wb.Sheets[sheetName]

      if (ws) {
        // AİLE DURUMU BİLDİRİMİ (EK:1) şablon hücre eşlemesi - resmi form yapısına göre
        // BİRİMİ: S2 etiket, T2 veri
        hucreYaz(ws, 'T2', gorevMudurlugu)
        hucreYaz(ws, 'U2', gorevMudurlugu)
        // Bildirimi Verenin - satır 3: T.C. Kimlik No, Vergi, Sicil No, Kurum Sicil No
        hucreYaz(ws, 'B3', personelTckn)
        hucreYaz(ws, 'D3', personelTckn)
        hucreYaz(ws, 'F3', kayit.sicil_no ?? '')
        hucreYaz(ws, 'H3', kayit.sicil_no ?? '')
        hucreYaz(ws, 'W3', kayit.sicil_no ?? '')
        hucreYaz(ws, 'B4', adSoyad ?? '')
        hucreYaz(ws, 'D4', adSoyad ?? '')
        hucreYaz(ws, 'P4', gorevUnvani)
        hucreYaz(ws, 'D5', kayit.medeni_hal ?? '')

        hucreYaz(ws, 'B7', kayit.esin_ad_soyad ?? '')
        hucreYaz(ws, 'D7', kayit.esin_tckn ?? '')
        hucreYaz(ws, 'B8', kayit.esin_ad_soyad ?? '')
        hucreYaz(ws, 'D8', kayit.esin_tckn ?? '')
        hucreYaz(ws, 'B9', kayit.esin_ad_soyad ?? '')
        hucreYaz(ws, 'D9', kayit.esin_tckn ?? '')
        hucreYaz(ws, 'F7', kayit.is_durumu ?? '')
        hucreYaz(ws, 'F8', kayit.is_durumu ?? '')
        hucreYaz(ws, 'F9', kayit.is_durumu ?? '')
        hucreYaz(ws, 'H7', kayit.gelir_durumu ?? '')
        hucreYaz(ws, 'H8', kayit.gelir_durumu ?? '')
        hucreYaz(ws, 'H9', kayit.gelir_durumu ?? '')

        const startRow = 13
        const maxRows = 15
        for (let i = 0; i < maxRows; i++) {
          const c = cocuklar[i] || {}
          const rr = startRow + i
          hucreYaz(ws, `B${rr}`, c.ad_soyad ?? '')
          hucreYaz(ws, `D${rr}`, c.tckn ?? '')
          hucreYaz(ws, `E${rr}`, tarihFormatla(c.dogum_tarihi))
          hucreYaz(ws, `G${rr}`, cinsiyetGoster(c.cinsiyet))
          hucreYaz(ws, `I${rr}`, c.baba_adi ?? '')
          hucreYaz(ws, `K${rr}`, c.ana_adi ?? '')
        }

        hucreYaz(ws, 'D18', adSoyad ?? '')
        hucreYaz(ws, 'D19', kayitTarihi)

        // Placeholder değiştirme (şablonda {{X}} varsa)
        const placeholders: Record<string, string> = {
          '{{SICIL_NO}}': kayit.sicil_no ?? '',
          '{{ADI_SOYADI}}': adSoyad ?? '',
          '{{MEDENI_HAL}}': kayit.medeni_hal ?? '',
          '{{ES_ADI_SOYADI}}': kayit.esin_ad_soyad ?? '',
          '{{ES_TCKN}}': kayit.esin_tckn ?? '',
          '{{IS_DURUMU}}': kayit.is_durumu ?? '',
          '{{GELIR_DURUMU}}': kayit.gelir_durumu ?? '',
          '{{KAYIT_ZAMANI}}': kayitTarihi,
        }
        for (let n = 1; n <= 15; n++) {
          const co = cocuklar[n - 1] || {}
          placeholders[`{{COCUK${n}_ADSOYAD}}`] = co.ad_soyad ?? ''
          placeholders[`{{COCUK${n}_TCKN}}`] = co.tckn ?? ''
          placeholders[`{{COCUK${n}_DOGUM}}`] = tarihFormatla(co.dogum_tarihi)
          placeholders[`{{COCUK${n}_CINSIYET}}`] = cinsiyetGoster(co.cinsiyet)
          placeholders[`{{COCUK${n}_BABA}}`] = co.baba_adi ?? ''
          placeholders[`{{COCUK${n}_ANA}}`] = co.ana_adi ?? ''
        }

        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
        for (let R = range.s.r; R <= range.e.r; R++) {
          for (let C = range.s.c; C <= range.e.c; C++) {
            const addr = XLSX.utils.encode_cell({ r: R, c: C })
            const cell = ws[addr]
            if (cell && typeof cell.v === 'string') {
              let v = cell.v
              for (const [key, val] of Object.entries(placeholders)) {
                if (v.includes(key)) v = v.split(key).join(val)
              }
              if (v !== cell.v) {
                const s = cell.s || {}
                ws[addr] = { v, t: 's' as const, s }
              }
            }
          }
        }

        const outBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true })
        const filename = `Aile_Durumu_Bildirimi_${(adSoyad ?? kayit.sicil_no ?? '').replace(/[/\\?*:\[\]]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`
        const encodedFilename = encodeURIComponent(filename)
        const fallbackName = 'Aile_Durumu_Bildirimi.xlsx'

        return new NextResponse(outBuf, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodedFilename}"`,
          },
        })
      }
    }

    // Şablon yoksa programatik oluştur (fallback)
    const headerStil = {
      fill: { fgColor: { rgb: 'E0E0E0' } },
      alignment: { horizontal: 'center' as const, vertical: 'center' as const, wrapText: true },
      font: { bold: true },
    }
    const dataStil = {
      alignment: { horizontal: 'left' as const, vertical: 'center' as const, wrapText: true },
    }
    const baslikStil = {
      alignment: { horizontal: 'center' as const, vertical: 'center' as const, wrapText: true },
      font: { bold: true, sz: 12 },
    }

    const rows: (string | number | XLSX.CellObject)[][] = []
    rows.push([
      { v: 'T.C. ADAPAZARI BELEDİYESİ', t: 's' as const, s: { ...dataStil, font: { bold: true } } },
      '', '', '', '', '',
      { v: 'AİLE DURUMU BİLDİRİMİ', t: 's' as const, s: baslikStil },
    ])
    rows.push([
      { v: 'EK:1', t: 's' as const, s: dataStil },
      '', '', '', '', '',
      { v: 'BİRİMİ', t: 's' as const, s: headerStil },
      { v: gorevMudurlugu, t: 's' as const, s: dataStil },
    ])
    rows.push([])
    rows.push([
      { v: 'T.C. Kimlik No', t: 's' as const, s: headerStil },
      { v: personelTckn, t: 's' as const, s: dataStil },
      { v: 'Vergi Kimlik No', t: 's' as const, s: headerStil },
      { v: '', t: 's' as const, s: dataStil },
      { v: 'Sosyal Güvenlik No / Sicil No', t: 's' as const, s: headerStil },
      { v: kayit.sicil_no ?? '', t: 's' as const, s: dataStil },
      { v: 'Kurum Sicil No', t: 's' as const, s: headerStil },
      { v: kayit.sicil_no ?? '', t: 's' as const, s: dataStil },
    ])
    rows.push([
      { v: 'Adı Soyadı', t: 's' as const, s: headerStil },
      { v: adSoyad ?? '', t: 's' as const, s: dataStil },
      { v: 'Görevi', t: 's' as const, s: headerStil },
      { v: gorevUnvani, t: 's' as const, s: dataStil },
    ])
    rows.push([
      { v: 'Medeni Hali', t: 's' as const, s: headerStil },
      { v: kayit.medeni_hal ?? '', t: 's' as const, s: dataStil },
    ])
    rows.push([])
    rows.push([
      { v: 'EŞİN', t: 's' as const, s: { ...headerStil, fill: { fgColor: { rgb: 'F5F5F5' } } } },
    ])
    rows.push([
      { v: 'Adı Soyadı', t: 's' as const, s: headerStil },
      { v: kayit.esin_ad_soyad ?? '', t: 's' as const, s: dataStil },
      { v: 'T.C. Kimlik No', t: 's' as const, s: headerStil },
      { v: kayit.esin_tckn ?? '', t: 's' as const, s: dataStil },
      { v: 'İş Durumu', t: 's' as const, s: headerStil },
      { v: kayit.is_durumu ?? '', t: 's' as const, s: dataStil },
      { v: 'Gelir Durumu', t: 's' as const, s: headerStil },
      { v: kayit.gelir_durumu ?? '', t: 's' as const, s: dataStil },
    ])
    rows.push([])
    rows.push([
      { v: 'MÜKELLEFLE OTURAN VEYA MÜKELLEF TARAFINDAN BAKILAN ÇOCUKLARIN DURUMU', t: 's' as const, s: { ...headerStil, fill: { fgColor: { rgb: 'F5F5F5' } } } },
    ])
    const cocukHeaders = ['Adı Soyadı', 'T.C. Kimlik No', 'Doğum Tarihi', 'Cinsiyet', 'Baba Adı', 'Ana Adı']
    rows.push(cocukHeaders.map(h => ({ v: h, t: 's' as const, s: headerStil })))
    cocuklar.forEach((c) => {
      rows.push([
        { v: c.ad_soyad ?? '', t: 's' as const, s: dataStil },
        { v: c.tckn ?? '', t: 's' as const, s: dataStil },
        { v: tarihFormatla(c.dogum_tarihi), t: 's' as const, s: dataStil },
        { v: cinsiyetGoster(c.cinsiyet), t: 's' as const, s: dataStil },
        { v: c.baba_adi ?? '', t: 's' as const, s: dataStil },
        { v: c.ana_adi ?? '', t: 's' as const, s: dataStil },
      ])
    })
    if (cocuklar.length === 0) {
      rows.push([
        { v: 'Çocuk kaydı bulunmamaktadır.', t: 's' as const, s: { ...dataStil, alignment: { horizontal: 'center' as const } } },
        '', '', '', '', '',
      ])
    }
    rows.push([])
    rows.push([
      { v: 'Düzenleyenin Adı Soyadı', t: 's' as const, s: headerStil },
      { v: adSoyad ?? '', t: 's' as const, s: dataStil },
      { v: 'İmzası / Tarih', t: 's' as const, s: headerStil },
      { v: kayitTarihi, t: 's' as const, s: dataStil },
    ])

    const colCount = 8
    for (let i = 0; i < rows.length; i++) {
      while (rows[i].length < colCount) rows[i].push('')
    }
    const ws = XLSX.utils.aoa_to_sheet(rows)
    applyGridBorders(ws, rows.length, colCount)
    ws['!cols'] = [
      { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 14 },
      { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Aile Durumu Bildirimi')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true })

    const filename = `Aile_Durumu_Bildirimi_${(adSoyad ?? kayit.sicil_no ?? '').replace(/[/\\?*:\[\]]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`
    const encodedFilename = encodeURIComponent(filename)
    const fallbackName = 'Aile_Durumu_Bildirimi.xlsx'

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodedFilename}"`,
      },
    })
  } catch (err) {
    console.error('AILE_EXCEL_API_HATASI: ', err)
    return NextResponse.json({ error: 'Excel oluşturulamadı' }, { status: 500 })
  }
}
