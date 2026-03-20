import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import ExcelJS from 'exceljs'
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

/** ExcelJS ile şablon yüklenir; sadece değer yazılır — kenarlık, dolgu, metni kaydır şablonda kalır */
async function aileExcelExcelJs(
  templatePath: string,
  kayit: Record<string, unknown>,
  cal: { ad_soyad?: string | null; tckn?: string | null } | null,
  adSoyad: string | null,
  personelTckn: string,
  gorevMudurlugu: string,
  gorevUnvani: string,
  cocuklar: Cocuk[],
  kayitTarihi: string,
) {
  const buf = fs.readFileSync(templatePath)
  const workbook = new ExcelJS.Workbook()
  // @ts-expect-error exceljs Buffer tipi ile @types/node Buffer uyumsuz; çalışma zamanında geçerli
  await workbook.xlsx.load(buf)

  const ws = workbook.worksheets[0]
  if (!ws) throw new Error('Sayfa yok')

  const sicil = String(kayit.sicil_no ?? '')

  // Satır 2: BİRİMİ (S2:X2 birleşik — değer sol üst hücreye)
  ws.getCell('S2').value = gorevMudurlugu

  // Bildirimi veren (satır 3–5)
  ws.getCell('D3').value = personelTckn
  ws.getCell('S3').value = '' // S3 verisi istenmiyor
  ws.getCell('X3').value = sicil
  ws.getCell('D4').value = adSoyad ?? ''
  ws.getCell('S4').value = gorevUnvani

  const medeniHal = String(kayit.medeni_hal ?? '').toLowerCase()
  ws.getCell('F5').value = medeniHal.includes('bekar') ? 'X' : ''
  ws.getCell('L5').value = medeniHal.includes('evli') ? 'X' : ''

  // Eş: TCKN D8; çalışıyor X E9 (eskiden H9); çalışmıyor H9
  ws.getCell('A9').value = String(kayit.esin_ad_soyad ?? '')
  ws.getCell('D8').value = String(kayit.esin_tckn ?? '')

  const isDurumu = String(kayit.is_durumu ?? '').toLowerCase()
  const gelirDurumu = String(kayit.gelir_durumu ?? '').toLowerCase()
  ws.getCell('E9').value = isDurumu.includes('çalışıyor') ? 'X' : ''
  ws.getCell('H9').value = isDurumu.includes('çalışmıyor') ? 'X' : ''
  // Gelir var / olan → J9 = "X", Geliri yok / olmayan → L9 = "X"
  const gelirVar =
    gelirDurumu.includes('geliri var') || gelirDurumu.includes('geliri olan')
  const gelirYok =
    gelirDurumu.includes('geliri yok') || gelirDurumu.includes('geliri olmayan')
  ws.getCell('J9').value = gelirVar ? 'X' : ''
  ws.getCell('L9').value = gelirYok ? 'X' : ''
  ws.getCell('M9').value = ''

  // Çocuklar: D=TC, E=doğum, G=cinsiyet, I=baba adı, K=ana
  const startRow = 13
  const maxRows = 5
  for (let i = 0; i < maxRows; i++) {
    const c = cocuklar[i] || {}
    const r = startRow + i
    const ad = c.ad_soyad ?? ''
    const tckn = c.tckn ?? ''
    const dogum = tarihFormatla(c.dogum_tarihi)
    const cins = cinsiyetGoster(c.cinsiyet)
    const baba = c.baba_adi ?? ''
    const ana = c.ana_adi ?? ''
    ws.getCell(`A${r}`).value = ad
    ws.getCell(`D${r}`).value = tckn
    ws.getCell(`E${r}`).value = dogum
    ws.getCell(`G${r}`).value = cins
    ws.getCell(`I${r}`).value = baba
    ws.getCell(`K${r}`).value = ana
  }

  ws.getCell('D19').value = adSoyad ?? ''
  ws.getCell('X19').value = kayitTarihi

  // Placeholder {{...}} (şablonda varsa)
  const placeholders: Record<string, string> = {
    '{{SICIL_NO}}': sicil,
    '{{ADI_SOYADI}}': adSoyad ?? '',
    '{{MEDENI_HAL}}': String(kayit.medeni_hal ?? ''),
    '{{ES_ADI_SOYADI}}': String(kayit.esin_ad_soyad ?? ''),
    '{{ES_TCKN}}': String(kayit.esin_tckn ?? ''),
    '{{IS_DURUMU}}': String(kayit.is_durumu ?? ''),
    '{{GELIR_DURUMU}}': String(kayit.gelir_durumu ?? ''),
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

  ws.eachRow((row) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      const v = cell.value
      if (typeof v === 'string') {
        let s = v
        for (const [key, val] of Object.entries(placeholders)) {
          if (s.includes(key)) s = s.split(key).join(val)
        }
        if (s !== v) cell.value = s
      } else if (v && typeof v === 'object' && 'richText' in (v as object)) {
        // Rich text — basit metin değilse atla
      }
    })
  })

  const outBuf = await workbook.xlsx.writeBuffer()
  return Buffer.from(outBuf)
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
      const outBuf = await aileExcelExcelJs(
        templatePath,
        kayit as unknown as Record<string, unknown>,
        cal,
        adSoyad,
        personelTckn,
        gorevMudurlugu,
        gorevUnvani,
        cocuklar,
        kayitTarihi,
      )

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
