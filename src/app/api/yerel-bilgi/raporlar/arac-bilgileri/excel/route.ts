import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'

const COL_LAST = 8

const THIN_BORDER = {
  top: { style: 'thin' as const, color: { rgb: 'D1D5DB' } },
  bottom: { style: 'thin' as const, color: { rgb: 'D1D5DB' } },
  left: { style: 'thin' as const, color: { rgb: 'D1D5DB' } },
  right: { style: 'thin' as const, color: { rgb: 'D1D5DB' } },
}

function padRow(cols: number, cells: (string | number)[]): (string | number)[] {
  const out = [...cells]
  while (out.length < cols) out.push('')
  return out
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    void req

    const [
      { data: rows, error: rowsErr },
      { data: sahipliklerRaw },
      { data: durumlarRaw },
      { data: turlerRaw },
      { data: altTurlerRaw },
      { data: mudurluklerRaw },
    ] = await Promise.all([
      supabase
        .from('yerel_bilgi_arac')
        .select('id, sira_no, sahiplik_durum_id, arac_durum_id, arac_turu_id, arac_alt_tur_id, plaka_no, sasi_no, mudurluk_id, aktif')
        .eq('aktif', true)
        .order('sira_no', { ascending: true })
        .order('id', { ascending: true }),
      supabase
        .from('yerel_bilgi_arac_sahiplik_durum')
        .select('id, tanim_adi')
        .eq('aktif', true),
      supabase
        .from('yerel_bilgi_arac_durum')
        .select('id, tanim_adi')
        .eq('aktif', true),
      supabase
        .from('yerel_bilgi_arac_turu')
        .select('id, tanim_adi')
        .eq('aktif', true),
      supabase
        .from('yerel_bilgi_arac_alt_tur')
        .select('id, tanim_adi')
        .eq('aktif', true),
      supabase
        .from('tanim_mudurluk')
        .select('id, mudurluk_adi')
        .eq('aktif', true),
    ])
    if (rowsErr) return NextResponse.json({ error: rowsErr.message }, { status: 500 })

    const sahiMap = new Map((sahipliklerRaw ?? []).map(r => [r.id, r.tanim_adi]))
    const durMap = new Map((durumlarRaw ?? []).map(r => [r.id, r.tanim_adi]))
    const turMap = new Map((turlerRaw ?? []).map(r => [r.id, r.tanim_adi]))
    const altMap = new Map((altTurlerRaw ?? []).map(r => [r.id, r.tanim_adi]))
    const mudMap = new Map((mudurluklerRaw ?? []).map(r => [r.id, r.mudurluk_adi]))
    const secili = rows ?? []

    const aoa: (string | number)[][] = [
      padRow(COL_LAST + 1, ['Araç Bilgileri Raporu']),
      padRow(COL_LAST + 1, [`Toplam kayıt: ${secili.length}`]),
      padRow(COL_LAST + 1, [`Anlık görüntü tarihi: ${new Date().toLocaleDateString('tr-TR')}`]),
      padRow(COL_LAST + 1, ['']),
      padRow(COL_LAST + 1, ['Sıra', 'Sahiplik', 'Araç durumu', 'Tür', 'Alt tür', 'Plaka', 'Şasi', 'Müdürlük', 'Durum']),
    ]
    for (const r of secili) {
      aoa.push([
        r.sira_no ?? r.id,
        sahiMap.get(r.sahiplik_durum_id) ?? '—',
        durMap.get(r.arac_durum_id) ?? '—',
        turMap.get(r.arac_turu_id) ?? '—',
        altMap.get(r.arac_alt_tur_id) ?? '—',
        (r.plaka_no ?? '').trim().length > 0 ? 'Var' : 'Yok',
        (r.sasi_no ?? '').trim(),
        mudMap.get(r.mudurluk_id) ?? '—',
        r.aktif ? 'Aktif' : 'Pasif',
      ])
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa)
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: COL_LAST } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: COL_LAST } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: COL_LAST } },
    ]
    ws['!cols'] = [
      { wch: 8 },
      { wch: 18 },
      { wch: 16 },
      { wch: 18 },
      { wch: 18 },
      { wch: 10 },
      { wch: 22 },
      { wch: 24 },
      { wch: 10 },
    ]

    const headerRow = 4
    const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
    for (let r = 0; r <= range.e.r; r++) {
      for (let c = 0; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c })
        if (!ws[addr]) continue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cell = ws[addr] as any
        const isTitle = r <= 2
        const isHeader = r === headerRow
        const inDataTable = r >= headerRow
        const alignCenter = isTitle || c === 0 || c === 5 || c === 8

        cell.s = {
          font: {
            name: 'Calibri',
            sz: 11,
            bold: isTitle || isHeader,
          },
          alignment: {
            vertical: 'center',
            horizontal: alignCenter ? 'center' : 'left',
            wrapText: true,
          },
          ...(inDataTable ? { border: THIN_BORDER } : {}),
        }
        if (isHeader) {
          cell.s.fill = { patternType: 'solid', fgColor: { rgb: 'E5E7EB' } }
        }
      }
    }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Arac Bilgileri')

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Arac_Bilgileri_Raporu.xlsx"',
      },
    })
  } catch (err) {
    console.error('YEREL_BILGI_ARAC_EXCEL_HATA', err)
    return NextResponse.json({ error: 'Excel oluşturulamadı.' }, { status: 500 })
  }
}
