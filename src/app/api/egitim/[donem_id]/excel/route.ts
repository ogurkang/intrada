import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'

function padRow(cols: number, cells: (string | number)[]): (string | number)[] {
  const r = [...cells]
  while (r.length < cols) r.push('')
  return r
}

function sureFmt(dk: number) {
  if (!dk) return '—'
  const s = Math.floor(dk / 60)
  const d = dk % 60
  return s > 0 ? `${s}s ${d > 0 ? `${d}dk` : ''}`.trim() : `${d}dk`
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ donem_id: string }> },
) {
  try {
    const { donem_id: didStr } = await params
    const donemId = Number.parseInt(didStr, 10)
    if (!Number.isFinite(donemId) || donemId <= 0) {
      return NextResponse.json({ error: 'Geçersiz dönem.' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    const [{ data: donem }, { data: egitimRaw }, { data: katilimRaw }] = await Promise.all([
      supabase
        .from('egitim_takvimi_donem')
        .select('id, yil, donem_adi, baslangic_tarihi, bitis_tarihi, durum')
        .eq('id', donemId)
        .maybeSingle(),
      supabase
        .from('egitim_takvimi_egitim')
        .select('id, egitim_adi, kanal, program, egitim_baslangic, egitim_bitis, sure_dakika')
        .eq('donem_id', donemId)
        .order('egitim_baslangic', { ascending: true }),
      supabase
        .from('egitim_istatistik_katilim')
        .select('egitim_id, sicil_no')
        .eq('donem_id', donemId),
    ])

    if (!donem) return NextResponse.json({ error: 'Dönem bulunamadı.' }, { status: 404 })

    const katilimMap: Record<number, number> = {}
    for (const k of katilimRaw ?? []) {
      katilimMap[k.egitim_id] = (katilimMap[k.egitim_id] ?? 0) + 1
    }

    const rows: (string | number)[][] = [
      padRow(9, [`Eğitim Dönemi: ${donem.donem_adi}`]),
      padRow(
        9,
        [
          `${new Date(donem.baslangic_tarihi).toLocaleDateString('tr-TR')} – ${new Date(donem.bitis_tarihi).toLocaleDateString('tr-TR')} · ${donem.durum}`,
        ],
      ),
      padRow(9, ['']),
      padRow(9, ['Sıra No', 'Eğitim Adı', 'Kurum', 'Tür', 'Başlangıç', 'Bitiş', 'Süre', 'Katılımcı Sayısı', 'Toplam Süre']),
    ]

    ;(egitimRaw ?? []).forEach((e, idx) => {
      const katilimci = katilimMap[e.id] ?? 0
      const sure = e.sure_dakika ?? 0
      const toplamSure = sure * katilimci
      const tur = e.program === 'Evet' ? 'Program' : e.program === 'Hayır' ? 'Diğer' : (e.program ?? 'Diğer')
      rows.push(
        padRow(9, [
          idx + 1,
          e.egitim_adi,
          e.kanal ?? '—',
          tur,
          e.egitim_baslangic ? new Date(e.egitim_baslangic).toLocaleDateString('tr-TR') : '—',
          e.egitim_bitis ? new Date(e.egitim_bitis).toLocaleDateString('tr-TR') : '—',
          sureFmt(sure),
          katilimci,
          toplamSure > 0 ? `${toplamSure} dk` : '—',
        ]),
      )
    })

    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
    ]
    ws['!cols'] = [
      { wch: 8 },
      { wch: 34 },
      { wch: 14 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
      { wch: 14 },
      { wch: 12 },
    ]

    const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
    for (let r = 0; r <= range.e.r; r++) {
      for (let c = 0; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c })
        if (!ws[addr]) continue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cell = ws[addr] as any
        const isTitle = r <= 1
        const isHead = r === 3
        const inTable = r >= 3 && c <= 8

        cell.s = {
          font: {
            name: 'Calibri',
            sz: 11,
            bold: isTitle || isHead,
          },
          alignment: {
            vertical: 'center',
            horizontal: isTitle ? 'center' : c === 0 || c >= 4 ? 'center' : 'left',
            wrapText: true,
          },
          ...(inTable
            ? {
                border: {
                  top: { style: 'thin', color: { rgb: 'D1D5DB' } },
                  bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
                  left: { style: 'thin', color: { rgb: 'D1D5DB' } },
                  right: { style: 'thin', color: { rgb: 'D1D5DB' } },
                },
              }
            : {}),
        }
        if (isHead) {
          cell.s.fill = { patternType: 'solid', fgColor: { rgb: 'E5E7EB' } }
        }
      }
    }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Egitim Detay')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const filename = `Egitim_Detay_${donemId}.xlsx`

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('EGITIM_DETAY_EXCEL_HATA', err)
    return NextResponse.json({ error: 'Excel oluşturulamadı.' }, { status: 500 })
  }
}
