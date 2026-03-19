import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'
import { applyGridBorders } from '@/lib/kesintiler-excel'

interface Cocuk {
  ad_soyad?: string
  tckn?: string
  dogum_tarihi?: string
  cinsiyet?: string
}

function tarihFormatla(t: string | null | undefined) {
  if (!t) return '—'
  try { return new Date(t).toLocaleDateString('tr-TR') } catch { return t }
}

function cinsiyetGoster(c: string | null | undefined) {
  if (!c) return '—'
  if (c === 'E' || c === 'Erkek') return 'E'
  if (c === 'K' || c === 'Kız' || c === 'Kadın') return 'K'
  return c
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
      .select('*, calisan(ad_soyad)')
      .eq('id', id)
      .single()

    if (error || !kayit) {
      return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 })
    }

    const adSoyad = (kayit.calisan as { ad_soyad: string | null } | null)?.ad_soyad ?? null
    const cocuklar = (Array.isArray(kayit.cocuklar_json) ? kayit.cocuklar_json : []) as Cocuk[]

    const headerStil = {
      fill: { fgColor: { rgb: 'E0E0E0' } },
      alignment: { horizontal: 'center' as const, vertical: 'center' as const, wrapText: true },
      font: { bold: true },
    }
    const dataStil = {
      alignment: { horizontal: 'left' as const, vertical: 'center' as const, wrapText: true },
    }

    const rows: (string | number | XLSX.CellObject)[][] = []

    rows.push(['T.C. ADAPAZARI BELEDİYESİ - AİLE BİLDİRİMİ'])
    rows.push([])
    rows.push(['Personel Bilgileri'])
    rows.push([
      { v: 'Sicil No', t: 's' as const, s: headerStil },
      { v: kayit.sicil_no ?? '', t: 's' as const, s: dataStil },
      { v: 'Ad Soyad', t: 's' as const, s: headerStil },
      { v: adSoyad ?? '', t: 's' as const, s: dataStil },
      { v: 'Medeni Hal', t: 's' as const, s: headerStil },
      { v: kayit.medeni_hal ?? '', t: 's' as const, s: dataStil },
    ])
    rows.push([])

    if (kayit.esin_ad_soyad || kayit.esin_tckn) {
      rows.push(['Eş Bilgileri'])
      rows.push([
        { v: 'Eş Adı Soyadı', t: 's' as const, s: headerStil },
        { v: kayit.esin_ad_soyad ?? '', t: 's' as const, s: dataStil },
        { v: 'Eş TCKN', t: 's' as const, s: headerStil },
        { v: kayit.esin_tckn ?? '', t: 's' as const, s: dataStil },
        { v: 'İş Durumu', t: 's' as const, s: headerStil },
        { v: kayit.is_durumu ?? '', t: 's' as const, s: dataStil },
        { v: 'Gelir Durumu', t: 's' as const, s: headerStil },
        { v: kayit.gelir_durumu ?? '', t: 's' as const, s: dataStil },
      ])
      rows.push([])
    }

    rows.push(['Çocuklar'])
    const cocukHeaders = ['#', 'Ad Soyad', 'TCKN', 'Doğum Tarihi', 'Cinsiyet']
    rows.push(cocukHeaders.map(h => ({ v: h, t: 's' as const, s: headerStil })))

    cocuklar.forEach((c, i) => {
      rows.push([
        { v: i + 1, t: 'n' as const, s: dataStil },
        { v: c.ad_soyad ?? '', t: 's' as const, s: dataStil },
        { v: c.tckn ?? '', t: 's' as const, s: dataStil },
        { v: tarihFormatla(c.dogum_tarihi), t: 's' as const, s: dataStil },
        { v: cinsiyetGoster(c.cinsiyet), t: 's' as const, s: dataStil },
      ])
    })

    if (cocuklar.length === 0) {
      rows.push([{ v: 'Çocuk kaydı bulunmamaktadır.', t: 's' as const, s: { ...dataStil, ...{ alignment: { horizontal: 'center' as const } } } }])
    }

    const colCount = 8
    const ws = XLSX.utils.aoa_to_sheet(rows)
    applyGridBorders(ws, rows.length, colCount)

    ws['!cols'] = [
      { wch: 6 },
      { wch: 20 },
      { wch: 10 },
      { wch: 22 },
      { wch: 12 },
      { wch: 8 },
      { wch: 14 },
      { wch: 14 },
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Aile Bildirimi')

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true })
    const filename = `Aile_Bildirimi_${adSoyad ?? kayit.sicil_no}_${new Date().toISOString().slice(0, 10)}.xlsx`
    const encodedFilename = encodeURIComponent(filename)
    const fallbackName = 'Aile_Bildirimi.xlsx'

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
