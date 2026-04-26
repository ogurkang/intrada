import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { createClient } from '@/lib/supabase/server'

function fmt(n: number | null): string {
  if (n == null || !Number.isFinite(Number(n))) return '-'
  return Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

const COL_COUNT = 13

function padRow(cells: (string | number)[]): (string | number)[] {
  const row = [...cells]
  while (row.length < COL_COUNT) row.push('')
  return row
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const donemId = Number.parseInt(String(searchParams.get('donem_id') ?? ''), 10)
    const yil = Number.parseInt(String(searchParams.get('yil') ?? ''), 10)
    const mudurluk = String(searchParams.get('mudurluk') ?? '').trim()
    if (!Number.isFinite(donemId) || !Number.isFinite(yil) || !mudurluk) {
      return NextResponse.json({ error: 'Parametreler geçersiz.' }, { status: 400 })
    }

    const { data: donem } = await supabase
      .from('stratejik_plan_donem' as never)
      .select('id, donem_adi, baslangic_tarihi')
      .eq('id', donemId)
      .maybeSingle()
    if (!donem) return NextResponse.json({ error: 'Dönem bulunamadı.' }, { status: 404 })

    const baslangicYil = Number(String((donem as { baslangic_tarihi?: string }).baslangic_tarihi ?? '').slice(0, 4))
    const yilIndex = yil - baslangicYil + 1
    if (yilIndex < 1 || yilIndex > 5) return NextResponse.json({ error: 'Yıl dönem dışı.' }, { status: 400 })
    const targetField = `yil_${yilIndex}` as 'yil_1' | 'yil_2' | 'yil_3' | 'yil_4' | 'yil_5'

    const [{ data: amacRows }, { data: hedefRows }] = await Promise.all([
      supabase.from('stratejik_plan_amac' as never).select('id, sira_no, kodu, amac_adi').eq('donem_id', donemId),
      supabase.from('stratejik_plan_hedef' as never).select('id, amac_id, sira_no, kodu, hedef_adi'),
    ])
    const amacIds = new Set<number>((amacRows ?? []).map(r => Number((r as { id: number }).id)))
    const hedefFiltered = (hedefRows ?? [])
      .filter(r => amacIds.has(Number((r as { amac_id: number }).amac_id)))
    const hedefIds = hedefFiltered
      .map(r => Number((r as { id: number }).id))
    const amacMap = new Map<number, { sira_no: number | null; kodu: string; amac_adi: string }>()
    for (const a of amacRows ?? []) {
      amacMap.set(Number((a as { id: number }).id), {
        sira_no: (a as { sira_no?: number | null }).sira_no ?? null,
        kodu: String((a as { kodu?: string }).kodu ?? ''),
        amac_adi: String((a as { amac_adi?: string }).amac_adi ?? ''),
      })
    }
    const hedefMap = new Map<number, { amac_id: number; sira_no: number | null; kodu: string; hedef_adi: string }>()
    for (const h of hedefFiltered) {
      hedefMap.set(Number((h as { id: number }).id), {
        amac_id: Number((h as { amac_id: number }).amac_id),
        sira_no: (h as { sira_no?: number | null }).sira_no ?? null,
        kodu: String((h as { kodu?: string }).kodu ?? ''),
        hedef_adi: String((h as { hedef_adi?: string }).hedef_adi ?? ''),
      })
    }

    const { data: altRows } = hedefIds.length
      ? await supabase
        .from('stratejik_plan_alt_hedef' as never)
        .select('id, hedef_id, sira_no, kodu, alt_hedef_adi, mudurluk')
        .in('hedef_id', hedefIds)
        .eq('mudurluk', mudurluk)
      : { data: [] as never[] }
    const altIds = (altRows ?? []).map(r => Number((r as { id: number }).id))
    const altMap = new Map<number, { hedef_id: number; sira_no: number | null; kodu: string; alt_hedef_adi: string; mudurluk: string }>()
    for (const a of altRows ?? []) {
      altMap.set(Number((a as { id: number }).id), {
        hedef_id: Number((a as { hedef_id: number }).hedef_id),
        sira_no: (a as { sira_no?: number | null }).sira_no ?? null,
        kodu: String((a as { kodu?: string }).kodu ?? ''),
        alt_hedef_adi: String((a as { alt_hedef_adi?: string }).alt_hedef_adi ?? ''),
        mudurluk: String((a as { mudurluk?: string }).mudurluk ?? ''),
      })
    }

    const { data: faaliyetRows } = altIds.length
      ? await supabase
        .from('stratejik_plan_faaliyet' as never)
        .select('id, alt_hedef_id, sira_no, faaliyet_adi')
        .in('alt_hedef_id', altIds)
        .order('alt_hedef_id', { ascending: true })
        .order('sira_no', { ascending: true, nullsFirst: false })
        .order('id', { ascending: true })
      : { data: [] as never[] }
    const faaliyetIds = (faaliyetRows ?? []).map(f => Number((f as { id: number }).id))
    const faaliyetler = (faaliyetRows ?? []).map(f => ({
      id: Number((f as { id: number }).id),
      alt_hedef_id: Number((f as { alt_hedef_id: number }).alt_hedef_id),
      sira_no: (f as { sira_no?: number | null }).sira_no ?? null,
      faaliyet_adi: String((f as { faaliyet_adi?: string }).faaliyet_adi ?? ''),
    }))

    const { data: gRows } = faaliyetIds.length
      ? await supabase
        .from('stratejik_plan_gosterge' as never)
        .select('id, faaliyet_id, sira_no, gosterge_adi, yil_1, yil_2, yil_3, yil_4, yil_5')
        .in('faaliyet_id', faaliyetIds)
        .order('faaliyet_id', { ascending: true })
        .order('sira_no', { ascending: true, nullsFirst: false })
        .order('id', { ascending: true })
      : { data: [] as never[] }

    const gIds = (gRows ?? []).map(g => Number((g as { id: number }).id))
    const { data: gerRows } = gIds.length
      ? await supabase
        .from('stratejik_plan_gosterge_gerceklesme' as never)
        .select('gosterge_id, ceyrek, gerceklesen, durum_aciklama')
        .eq('stratejik_donem_id', donemId)
        .eq('yil', yil)
        .in('gosterge_id', gIds)
      : { data: [] as never[] }

    const qMap = new Map<string, number>()
    const aciklamaMap = new Map<string, string>()
    for (const r of gerRows ?? []) {
      const gid = Number((r as { gosterge_id: number }).gosterge_id)
      const q = Number((r as { ceyrek: number }).ceyrek)
      const v = Number((r as { gerceklesen?: number }).gerceklesen ?? 0)
      qMap.set(`${gid}:${q}`, Number.isFinite(v) ? v : 0)
      aciklamaMap.set(`${gid}:${q}`, String((r as { durum_aciklama?: string }).durum_aciklama ?? ''))
    }

    const rows: (string | number)[][] = [
      padRow(['STRATEJİK PLAN VERİ GİRİŞ RAPORU']),
      padRow([mudurluk]),
      padRow([`Yıl: ${yil}`]),
      padRow(['']),
    ]

    const gByFaaliyet = new Map<number, typeof gRows>()
    for (const g of gRows ?? []) {
      const fid = Number((g as { faaliyet_id?: number }).faaliyet_id)
      const list = gByFaaliyet.get(fid) ?? []
      list.push(g)
      gByFaaliyet.set(fid, list)
    }

    const contextRows = new Set<number>()
    const faaliyetRowsSet = new Set<number>()
    const headerRows = new Set<number>()
    let lastContextKey = ''
    for (const faaliyet of faaliyetler) {
      const alt = altMap.get(faaliyet.alt_hedef_id)
      const hedef = alt ? hedefMap.get(alt.hedef_id) : undefined
      const amac = hedef ? amacMap.get(hedef.amac_id) : undefined
      const amacMetni = amac ? `${amac.kodu ? `${amac.kodu} - ` : ''}${amac.amac_adi}` : '-'
      const hedefMetni = hedef ? `${hedef.kodu ? `${hedef.kodu} - ` : ''}${hedef.hedef_adi}` : '-'
      const performansMetni = alt ? `${alt.kodu ? `${alt.kodu} - ` : ''}${alt.alt_hedef_adi}` : '-'
      const contextKey = `${amacMetni}|${hedefMetni}|${performansMetni}`
      if (contextKey !== lastContextKey) {
        contextRows.add(rows.length)
        rows.push(padRow(['Amaç:', amacMetni]))
        contextRows.add(rows.length)
        rows.push(padRow(['Hedef:', hedefMetni]))
        contextRows.add(rows.length)
        rows.push(padRow(['Performans Hedefi:', performansMetni]))
        lastContextKey = contextKey
      }

      faaliyetRowsSet.add(rows.length)
      rows.push(padRow(['Faaliyet:', `${faaliyet.sira_no ?? ''}${faaliyet.sira_no ? ' - ' : ''}${faaliyet.faaliyet_adi}`]))
      headerRows.add(rows.length)
      rows.push(padRow(['Sıra No', 'Gösterge Adı', 'Çeyrek 1', 'Durum Açıklaması', 'Çeyrek 2', 'Durum Açıklaması', 'Çeyrek 3', 'Durum Açıklaması', 'Çeyrek 4', 'Durum Açıklaması', 'Yıl Bilgisi ve Verisi', 'Yıllık Gerçekleşme', 'Gerçekleşme Oranı']))

      const gostergeler = gByFaaliyet.get(faaliyet.id) ?? []
      gostergeler.forEach((g, i) => {
        const gid = Number((g as { id: number }).id)
        const q1 = qMap.get(`${gid}:1`) ?? 0
        const q2 = qMap.get(`${gid}:2`) ?? 0
        const q3 = qMap.get(`${gid}:3`) ?? 0
        const q4 = qMap.get(`${gid}:4`) ?? 0
        const yillik = q1 + q2 + q3 + q4
        const hedefDeger = Number((g as Record<string, unknown>)[targetField] ?? 0)
        const oran = hedefDeger > 0 ? (yillik / hedefDeger) * 100 : null
        rows.push(padRow([
          i + 1,
          String((g as { gosterge_adi?: string }).gosterge_adi ?? ''),
          fmt(q1),
          aciklamaMap.get(`${gid}:1`) ?? '',
          fmt(q2),
          aciklamaMap.get(`${gid}:2`) ?? '',
          fmt(q3),
          aciklamaMap.get(`${gid}:3`) ?? '',
          fmt(q4),
          aciklamaMap.get(`${gid}:4`) ?? '',
          fmt(Number.isFinite(hedefDeger) ? hedefDeger : null),
          fmt(yillik),
          oran == null ? '-' : `%${oran.toFixed(2)}`,
        ]))
      })
    }

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Veri Giriş', {
      views: [{ showGridLines: true }],
    })
    ws.pageSetup = {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9, // A4
      horizontalCentered: true,
      margins: {
        left: 0.2,
        right: 0.2,
        top: 0.4,
        bottom: 0.4,
        header: 0.2,
        footer: 0.2,
      },
    }
    ws.columns = [
      { width: 12 },
      { width: 42 },
      { width: 12 },
      { width: 24 },
      { width: 12 },
      { width: 24 },
      { width: 12 },
      { width: 24 },
      { width: 12 },
      { width: 24 },
      { width: 16 },
      { width: 16 },
      { width: 14 },
    ]
    for (const row of rows) ws.addRow(row)

    ws.mergeCells(1, 1, 1, COL_COUNT)
    ws.mergeCells(2, 1, 2, COL_COUNT)
    ws.mergeCells(3, 1, 3, COL_COUNT)
    for (const r of [...contextRows, ...faaliyetRowsSet]) {
      ws.mergeCells(r + 1, 2, r + 1, COL_COUNT)
    }

    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    }

    for (let r = 1; r <= ws.rowCount; r++) {
      const zeroRow = r - 1
      const isTop = zeroRow <= 2
      const isHeader = headerRows.has(zeroRow)
      const isContext = contextRows.has(zeroRow)
      const isFaaliyet = faaliyetRowsSet.has(zeroRow)
      const isData = zeroRow >= 4
      const row = ws.getRow(r)
      if (isContext || isFaaliyet) row.height = 22
      for (let c = 1; c <= COL_COUNT; c++) {
        const cell = row.getCell(c)
        cell.font = {
          name: 'Calibri',
          size: 11,
          bold: isTop || isHeader || isContext || isFaaliyet,
        }
        cell.alignment = {
          vertical: 'middle',
          horizontal: isTop ? 'center' : (c === 2 || isContext || isFaaliyet) ? 'left' : 'center',
          wrapText: true,
        }
        if (isData) cell.border = thinBorder
        if (isHeader || isContext || isFaaliyet) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: isHeader ? 'FFE5E7EB' : 'FFF1F5F9' },
          }
        }
      }
    }

    const buf = await wb.xlsx.writeBuffer()
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Stratejik_Veri_Giris_${yil}.xlsx"`,
      },
    })
  } catch (err) {
    console.error('STRATEJIK_VERI_GIRIS_EXCEL_HATA', err)
    return NextResponse.json({ error: 'Excel olusturulamadi.' }, { status: 500 })
  }
}
