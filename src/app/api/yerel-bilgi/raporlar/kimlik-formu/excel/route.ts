import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'

function str(v: unknown) {
  const s = String(v ?? '').trim()
  return s || '—'
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const idQ = Number(req.nextUrl.searchParams.get('id') ?? '')
  const sb = supabase as any
  const q = sb.from('yerel_bilgi_belediye_kimlik_formu').select('*')
  const { data: row } = Number.isFinite(idQ) && idQ > 0
    ? await q.eq('id', idQ).maybeSingle()
    : await q.eq('aktif', true).order('updated_at', { ascending: false }).limit(1).maybeSingle()

  if (!row) return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 })

  const sol: [string, string][] = [
    ['Form Adı', str(row.form_adi)],
    ['İşlem Yapan', str(row.islem_yapan)],
    ['Belediye Kuruluş Yılı', row.belediye_kurulus_tarihi ? String(row.belediye_kurulus_tarihi).slice(0, 4) : '—'],
    ['Belediye Başkanı Soyadı', str(row.baskan_soyadi)],
    ['Seçime Girdiği Parti', str(row.baskan_secime_girdigi_parti)],
    ['Bu Belediyede Kaçıncı Dönem', str(row.baskan_donem)],
    ['WEB Adresi', str(row.belediye_web_adresi)],
    ['Telefon Numarası', str(row.belediye_telefon_numarasi)],
    ['Çağrı Merkezi', str(row.belediye_cagri_merkezi)],
    ['Mahalle Sayısı', row.mahalle_sayisi == null ? '—' : String(row.mahalle_sayisi)],
  ]
  const sag: [string, string][] = [
    ['Kayıt Tarihi', str(row.kayit_tarihi)],
    ['Durumu', row.aktif ? 'Aktif' : 'Pasif'],
    ['Belediye Başkanı Adı', str(row.baskan_adi)],
    ['Belediye Başkanı Cinsiyeti', str(row.baskan_cinsiyeti)],
    ['Mevcut Parti', str(row.baskan_mevcut_parti)],
    ['Başkan Cep Telefonu', str(row.baskan_cep_telefonu)],
    ['E-Posta', str(row.belediye_e_posta)],
    ['Faks Numarası', str(row.belediye_faks_numarasi)],
    ['Onaylı Sosyal Medya Hesabı', str(row.belediye_onayli_sosyal_medya_hesabi)],
  ]

  const satirSayisi = Math.max(sol.length, sag.length)
  const rows: string[][] = [
    ['Kimlik Form Raporu', '', '', '', ''],
    ['', '', '', '', ''],
  ]
  for (let i = 0; i < satirSayisi; i++) {
    const l = sol[i]
    const r = sag[i]
    rows.push([
      l?.[0] ?? '',
      l?.[1] ?? '',
      '',
      r?.[0] ?? '',
      r?.[1] ?? '',
    ])
  }
  rows.push([`Açık Adres: ${str(row.belediye_acik_adresi)}`, '', '', '', ''])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: satirSayisi + 2, c: 0 }, e: { r: satirSayisi + 2, c: 4 } },
  ]
  ws['!cols'] = [{ wch: 26 }, { wch: 30 }, { wch: 3 }, { wch: 26 }, { wch: 30 }]

  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
  for (let r = 0; r <= range.e.r; r++) {
    for (let c = 0; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c })
      if (!ws[addr]) continue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cell = ws[addr] as any
      const isTopTitle = r === 0
      const isSpacerCol = c === 2
      const isAddressRow = r === satirSayisi + 2
      const isLabelCol = c === 0 || c === 3
      const inMainArea = r >= 2 && r < satirSayisi + 2
      const bordered = (inMainArea && !isSpacerCol) || isAddressRow

      cell.s = {
        font: {
          name: 'Calibri',
          sz: isTopTitle ? 13 : 11,
          bold: isTopTitle || isLabelCol || isAddressRow,
        },
        alignment: {
          vertical: 'center',
          horizontal: isTopTitle ? 'center' : 'left',
          wrapText: true,
        },
      }
      if (bordered) {
        cell.s.border = {
          top: { style: 'thin', color: { rgb: 'D1D5DB' } },
          bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
          left: { style: 'thin', color: { rgb: 'D1D5DB' } },
          right: { style: 'thin', color: { rgb: 'D1D5DB' } },
        }
      }
      if (isAddressRow) {
        cell.s.fill = { patternType: 'solid', fgColor: { rgb: 'F8FAFC' } }
      }
    }
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Kimlik Formu')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="Kimlik_Form_Raporu.xlsx"',
    },
  })
}
