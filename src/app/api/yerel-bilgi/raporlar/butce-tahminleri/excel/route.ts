import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess } from '@/lib/app-access'
import { mudurlukIdFromAuthSession } from '@/lib/kadro-mudurluk-id'

function fmt(n: number | null) {
  if (n == null || !Number.isFinite(Number(n))) return '0,00'
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n))
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  const access = await getAppAccess(supabase, user.id)
  const mudId = await mudurlukIdFromAuthSession(supabase, user.id, access)
  if (mudId == null) return NextResponse.json({ error: 'Müdürlük bulunamadı' }, { status: 400 })

  const [{ data: mud }, { data: gider }, { data: gelir }, { data: islem }] = await Promise.all([
    supabase.from('tanim_mudurluk').select('mudurluk_adi').eq('id', mudId).maybeSingle(),
    supabase.from('yerel_bilgi_butce_gider').select('id, tanim_adi').eq('aktif', true).order('sira_no', { ascending: true, nullsFirst: false }).order('id', { ascending: true }),
    supabase.from('yerel_bilgi_butce_gelir').select('id, tanim_adi').eq('aktif', true).order('sira_no', { ascending: true, nullsFirst: false }).order('id', { ascending: true }),
    supabase.from('yerel_bilgi_butce_tahmin_islem').select('*').eq('mudurluk_id', mudId),
  ])

  const giderMap = new Map<number, number | null>()
  const gelirMap = new Map<number, number | null>()
  for (const r of islem ?? []) {
    const row = r as { butce_gider_kalem_id?: number | null; butce_gelir_kalem_id?: number | null; tutar?: number | null }
    if (row.butce_gider_kalem_id != null) giderMap.set(row.butce_gider_kalem_id, row.tutar ?? null)
    if (row.butce_gelir_kalem_id != null) gelirMap.set(row.butce_gelir_kalem_id, row.tutar ?? null)
  }

  const yil = new Date().getFullYear() + 1
  const giderRows = gider ?? []
  const gelirRows = gelir ?? []
  const satirSayisi = Math.max(giderRows.length, gelirRows.length)
  const giderToplam = giderRows.reduce((acc, k) => acc + Number(giderMap.get(k.id) ?? 0), 0)
  const gelirToplam = gelirRows.reduce((acc, k) => acc + Number(gelirMap.get(k.id) ?? 0), 0)

  const rows: string[][] = [
    [`${yil} Yılı Bütçe Tahminleri Raporu`, '', '', '', ''],
    [`Müdürlük: ${mud?.mudurluk_adi ?? 'Tanımsız'}`, '', '', '', ''],
    ['', '', '', '', ''],
    ['Bütçe Gider Türü (Tahmin)', '', '', 'Bütçe Gelir Türü (Tahmin)', ''],
  ]

  for (let i = 0; i < satirSayisi; i++) {
    const g = giderRows[i]
    const l = gelirRows[i]
    rows.push([
      g?.tanim_adi ?? '',
      g ? fmt(giderMap.get(g.id) ?? null) : '',
      '',
      l?.tanim_adi ?? '',
      l ? fmt(gelirMap.get(l.id) ?? null) : '',
    ])
  }
  rows.push(['Toplam', fmt(giderToplam), '', 'Toplam', fmt(gelirToplam)])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
    { s: { r: 3, c: 3 }, e: { r: 3, c: 4 } },
  ]
  ws['!cols'] = [{ wch: 42 }, { wch: 12 }, { wch: 4 }, { wch: 42 }, { wch: 12 }]

  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
  for (let r = 0; r <= range.e.r; r++) {
    for (let c = 0; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c })
      if (!ws[addr]) continue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cell = ws[addr] as any
      const isTopTitle = r <= 1
      const isBlockHeader = r === 3 && (c === 0 || c === 1 || c === 3 || c === 4)
      const isTotalRow = r === satirSayisi + 4
      const isAmountCol = c === 1 || c === 4
      const isSpacerCol = c === 2
      const isDataCell = r >= 4 && !isSpacerCol

      cell.s = {
        font: {
          name: 'Calibri',
          sz: 11,
          bold: isTopTitle || isBlockHeader || isTotalRow,
        },
        alignment: {
          vertical: 'center',
          horizontal: isTopTitle ? 'center' : isBlockHeader ? 'left' : isAmountCol ? 'right' : 'left',
          wrapText: true,
        },
      }

      if (isDataCell || isBlockHeader) {
        cell.s.border = {
          top: { style: 'thin', color: { rgb: 'D1D5DB' } },
          bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
          left: { style: 'thin', color: { rgb: 'D1D5DB' } },
          right: { style: 'thin', color: { rgb: 'D1D5DB' } },
        }
      }
      if (isBlockHeader || isTotalRow) {
        cell.s.fill = { patternType: 'solid', fgColor: { rgb: 'F1F5F9' } }
      }
    }
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Butce Tahmin')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return new NextResponse(buf, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': "attachment; filename=\"Butce_Tahminleri_Raporu.xlsx\"" } })
}
