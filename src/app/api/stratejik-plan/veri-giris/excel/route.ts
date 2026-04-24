import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'

function fmt(n: number | null): string {
  if (n == null || !Number.isFinite(Number(n))) return '-'
  return Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
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
      supabase.from('stratejik_plan_amac' as never).select('id').eq('donem_id', donemId),
      supabase.from('stratejik_plan_hedef' as never).select('id, amac_id'),
    ])
    const amacIds = new Set<number>((amacRows ?? []).map(r => Number((r as { id: number }).id)))
    const hedefIds = (hedefRows ?? [])
      .filter(r => amacIds.has(Number((r as { amac_id: number }).amac_id)))
      .map(r => Number((r as { id: number }).id))

    const { data: altRows } = hedefIds.length
      ? await supabase
        .from('stratejik_plan_alt_hedef' as never)
        .select('id, mudurluk')
        .in('hedef_id', hedefIds)
        .eq('mudurluk', mudurluk)
      : { data: [] as never[] }
    const altIds = (altRows ?? []).map(r => Number((r as { id: number }).id))

    const { data: gRows } = altIds.length
      ? await supabase
        .from('stratejik_plan_gosterge' as never)
        .select('id, gosterge_adi, yil_1, yil_2, yil_3, yil_4, yil_5')
        .in('alt_hedef_id', altIds)
        .order('id', { ascending: true })
      : { data: [] as never[] }

    const gIds = (gRows ?? []).map(g => Number((g as { id: number }).id))
    const { data: gerRows } = gIds.length
      ? await supabase
        .from('stratejik_plan_gosterge_gerceklesme' as never)
        .select('gosterge_id, ceyrek, gerceklesen')
        .eq('stratejik_donem_id', donemId)
        .eq('yil', yil)
        .in('gosterge_id', gIds)
      : { data: [] as never[] }

    const qMap = new Map<string, number>()
    for (const r of gerRows ?? []) {
      const gid = Number((r as { gosterge_id: number }).gosterge_id)
      const q = Number((r as { ceyrek: number }).ceyrek)
      const v = Number((r as { gerceklesen?: number }).gerceklesen ?? 0)
      qMap.set(`${gid}:${q}`, Number.isFinite(v) ? v : 0)
    }

    const rows: (string | number)[][] = [
      ['STRATEJIK PLAN VERI GIRISI RAPORU'],
      [mudurluk],
      [`Yıl: ${yil}`],
      [''],
      ['Sıra No', 'Gösterge Adı', 'Çeyrek 1', 'Çeyrek 2', 'Çeyrek 3', 'Çeyrek 4', 'Yıl Bilgisi ve Verisi', 'Yıllık Gerçekleşme', 'Gerçekleşme Oranı'],
    ]

    ;(gRows ?? []).forEach((g, i) => {
      const gid = Number((g as { id: number }).id)
      const q1 = qMap.get(`${gid}:1`) ?? 0
      const q2 = qMap.get(`${gid}:2`) ?? 0
      const q3 = qMap.get(`${gid}:3`) ?? 0
      const q4 = qMap.get(`${gid}:4`) ?? 0
      const yillik = q1 + q2 + q3 + q4
      const hedef = Number((g as Record<string, unknown>)[targetField] ?? 0)
      const oran = hedef > 0 ? (yillik / hedef) * 100 : null
      rows.push([
        i + 1,
        String((g as { gosterge_adi?: string }).gosterge_adi ?? ''),
        fmt(q1),
        fmt(q2),
        fmt(q3),
        fmt(q4),
        fmt(Number.isFinite(hedef) ? hedef : null),
        fmt(yillik),
        oran == null ? '-' : `%${oran.toFixed(2)}`,
      ])
    })

    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } },
    ]
    ws['!cols'] = [{ wch: 8 }, { wch: 40 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 14 }]

    const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
    for (let r = 0; r <= range.e.r; r++) {
      for (let c = 0; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c })
        if (!ws[addr]) continue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cell = ws[addr] as any
        const isTop = r <= 2
        const isHeader = r === 4
        const isData = r >= 4
        cell.s = {
          font: { name: 'Calibri', sz: 11, bold: isTop || isHeader },
          alignment: { vertical: 'center', horizontal: isTop ? 'center' : c === 1 ? 'left' : 'center', wrapText: true },
          ...(isData
            ? {
                border: {
                  top: { style: 'thin', color: { rgb: 'D1D5DB' } },
                  bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
                  left: { style: 'thin', color: { rgb: 'D1D5DB' } },
                  right: { style: 'thin', color: { rgb: 'D1D5DB' } },
                },
              }
            : {}),
          ...(isHeader ? { fill: { patternType: 'solid', fgColor: { rgb: 'E5E7EB' } } } : {}),
        }
      }
    }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Veri Giriş')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
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
