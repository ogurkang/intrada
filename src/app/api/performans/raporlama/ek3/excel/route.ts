import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess } from '@/lib/app-access'
import { hayaletProfilDurumCoz } from '@/lib/hayalet-profil-server'
import { resolvePerformansOturum } from '@/lib/performans-oturum'
import { performansRaporlamaVeriYukle } from '@/lib/performans-raporlama-yukle'

const BASLIK_STIL = {
  font: { bold: true, sz: 11 },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  fill: { fgColor: { rgb: 'E8EEF4' } },
  border: {
    top: { style: 'thin', color: { rgb: 'CCCCCC' } },
    bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
    left: { style: 'thin', color: { rgb: 'CCCCCC' } },
    right: { style: 'thin', color: { rgb: 'CCCCCC' } },
  },
}

const HUCRE_STIL = {
  font: { sz: 10 },
  alignment: { vertical: 'center', wrapText: true },
  border: {
    top: { style: 'thin', color: { rgb: 'DDDDDD' } },
    bottom: { style: 'thin', color: { rgb: 'DDDDDD' } },
    left: { style: 'thin', color: { rgb: 'DDDDDD' } },
    right: { style: 'thin', color: { rgb: 'DDDDDD' } },
  },
}

function stilUygula(ws: XLSX.WorkSheet, headerRow: number, colCount: number, dataRows: number) {
  for (let c = 0; c < colCount; c++) {
    const addr = XLSX.utils.encode_cell({ r: headerRow, c })
    if (ws[addr]) ws[addr].s = BASLIK_STIL
  }
  for (let r = headerRow + 1; r < dataRows; r++) {
    for (let c = 0; c < colCount; c++) {
      const addr = XLSX.utils.encode_cell({ r, c })
      if (ws[addr]) ws[addr].s = HUCRE_STIL
    }
  }
}

export async function GET(req: NextRequest) {
  const donemId = Number(req.nextUrl.searchParams.get('donem_id'))
  const mudurlukFiltre = req.nextUrl.searchParams.get('mudurluk')?.trim() ?? ''
  if (!Number.isFinite(donemId) || donemId <= 0) {
    return NextResponse.json({ hata: 'donem_id gerekli.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ hata: 'Oturum gerekli.' }, { status: 401 })

  const access = await getAppAccess(supabase, user.id)
  const hayaletDurum = await hayaletProfilDurumCoz(supabase, access)
  const oturum = await resolvePerformansOturum(supabase, user.id, access, hayaletDurum)

  const { hata, veri } = await performansRaporlamaVeriYukle(supabase, donemId, {
    currentSicil: oturum.sicil,
    adminBypass: oturum.adminBypass,
  })
  if (hata || !veri) {
    return NextResponse.json({ hata: hata ?? 'Veri yüklenemedi.' }, { status: 400 })
  }
  if (!veri.erisimVar) {
    return NextResponse.json({ hata: 'Bu işlem için yetkiniz yok.' }, { status: 403 })
  }

  let satirlar = veri.ek3FlatListe
  if (mudurlukFiltre) {
    satirlar = satirlar.filter(s => (s.mudurluk_adi ?? '') === mudurlukFiltre)
  }

  const wb = XLSX.utils.book_new()
  const donemEtiket = veri.donem.sira_no
    ? `${veri.donem.yil}_${veri.donem.sira_no.replace(/\//g, '-')}`
    : String(veri.donem.yil)

  const baslikEk = mudurlukFiltre ? ` — ${mudurlukFiltre}` : ''
  const rows: (string | number | null)[][] = [
    [`PERFORMANS DEĞERLENDİRME CETVELİ${baslikEk}`],
    [],
    [
      'SIRA NO',
      'SİCİLİ',
      'ADI-SOYADI',
      'MÜDÜRLÜK',
      'ÜNVANI',
      '1.AMİR NOT ORTALAMASI',
      '2.AMİR NOT ORTALAMASI',
      'GENEL TOPLAM NOT ORTALAMASI',
      '1.AMİR',
      '2.AMİR',
    ],
  ]

  satirlar.forEach((s, i) => {
    rows.push([
      i + 1,
      s.sicil_no,
      s.ad_soyad,
      s.mudurluk_adi ?? '',
      s.unvan ?? '',
      s.puan_amir1,
      s.puan_amir2,
      s.ortalama,
      s.amir1_ad ?? '',
      s.amir2_ad ?? '',
    ])
  })

  if (satirlar.length === 0) {
    rows.push(['Bu dönemde raporlanacak kayıt yok.'])
  }

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [8, 12, 28, 28, 24, 18, 18, 22, 22, 22].map(w => ({ wch: w }))
  stilUygula(ws, 2, 10, rows.length)
  if (ws['A1']) {
    ws['A1'].s = { font: { bold: true, sz: 12 }, alignment: { horizontal: 'center' } }
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }]
  }
  XLSX.utils.book_append_sheet(wb, ws, 'Cetvel')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  const dosyaAdi = `Ek3_Performans_Cetveli_${donemEtiket}.xlsx`

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${dosyaAdi}"`,
    },
  })
}
