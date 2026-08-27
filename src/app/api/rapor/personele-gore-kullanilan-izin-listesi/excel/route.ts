import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'
import {
  gruplaPersoneleGoreIzinSatirlari,
  yuklePersoneleGoreKullanilanIzinListesi,
} from '@/lib/rapor-personele-gore-izin-listesi'

const MIN_YIL = 2000
const MAX_YIL = 2035

const THIN_BORDER = {
  top: { style: 'thin' as const, color: { rgb: 'D1D5DB' } },
  bottom: { style: 'thin' as const, color: { rgb: 'D1D5DB' } },
  left: { style: 'thin' as const, color: { rgb: 'D1D5DB' } },
  right: { style: 'thin' as const, color: { rgb: 'D1D5DB' } },
}

function parseYil(v: string | null): number {
  const parsed = Number.parseInt(v ?? '', 10)
  if (!Number.isFinite(parsed)) return new Date().getFullYear()
  return Math.min(MAX_YIL, Math.max(MIN_YIL, parsed))
}

function padRow(cols: number, cells: (string | number)[]): (string | number)[] {
  const r = [...cells]
  while (r.length < cols) r.push('')
  return r
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const yil = parseYil(searchParams.get('y'))
    const mudurlukFilterler = String(searchParams.get('m') ?? '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
    const sicilFiltre = String(searchParams.get('s') ?? '').trim().toLocaleLowerCase('tr-TR')
    const turFiltre = String(searchParams.get('t') ?? '').trim()
    const durumFiltre = String(searchParams.get('d') ?? 'taslak-haric').trim()
    const personelFiltre = String(searchParams.get('pe') ?? '').trim()

    const { satirlar: hamSatirlar, hata } = await yuklePersoneleGoreKullanilanIzinListesi(supabase, yil)
    if (hata) return NextResponse.json({ error: hata }, { status: 500 })
    let satirlar = hamSatirlar

    if (mudurlukFilterler.length) {
      const set = new Set(mudurlukFilterler)
      satirlar = satirlar.filter(r => set.has(r.mudurluk))
    }
    if (sicilFiltre) {
      satirlar = satirlar.filter(
        r =>
          r.sicil_no.toLocaleLowerCase('tr-TR').includes(sicilFiltre) ||
          r.ad_soyad.toLocaleLowerCase('tr-TR').includes(sicilFiltre),
      )
    }
    if (turFiltre) {
      satirlar = satirlar.filter(r => r.tur === turFiltre)
    }
    if (durumFiltre === 'taslak-haric') {
      satirlar = satirlar.filter(r => r.durum !== 'Taslak')
    } else if (durumFiltre && durumFiltre !== 'tumu') {
      satirlar = satirlar.filter(r => r.durum === durumFiltre)
    }
    if (personelFiltre === 'mudurler') {
      satirlar = satirlar.filter(r => r.mudur)
    }

    const mudurlukMetin = mudurlukFilterler.length ? mudurlukFilterler.join(', ') : 'Tümü'
    const turMetin = turFiltre || 'Tümü'
    const durumMetin =
      durumFiltre === 'taslak-haric' ? 'Taslak hariç' : durumFiltre === 'tumu' || !durumFiltre ? 'Tümü' : durumFiltre
    const personelMetin = personelFiltre === 'mudurler' ? 'Müdürler' : 'Tümü'
    const olusturmaTarihi = new Date().toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    const COLS = 9
    const KOLON_BASLIK = ['Sıra No', 'Sicil No', 'Adı Soyadı', 'Unvan', 'Ayrılış', 'Başlama', 'İzin Türü', 'Durum', 'Gün Bilgisi']
    const gruplar = gruplaPersoneleGoreIzinSatirlari(satirlar)
    const dataRows: (string | number)[][] = []
    const kisiBaslikSatirlari = new Set<number>()
    const kisiToplamSatirlari = new Set<number>()
    const kimlikBirlestirmeleri: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = []
    let excelRow = 5
    for (const grup of gruplar) {
      kisiBaslikSatirlari.add(excelRow)
      dataRows.push(padRow(COLS, KOLON_BASLIK))
      excelRow++
      const blokBas = excelRow
      grup.kayitlar.forEach((s, i) => {
        dataRows.push(
          padRow(COLS, [
            i === 0 ? grup.sira : '',
            i === 0 ? grup.sicil_no : '',
            i === 0 ? grup.ad_soyad : '',
            i === 0 ? grup.unvan : '',
            s.ayrilis,
            s.baslama,
            s.tur,
            s.durum,
            s.gun,
          ]),
        )
        excelRow++
      })
      kisiToplamSatirlari.add(excelRow)
      dataRows.push(padRow(COLS, ['', '', '', '', '', '', '', 'İzin toplamı', grup.toplamGun]))
      excelRow++
      const blokSon = excelRow - 1
      if (blokSon > blokBas) {
        for (let c = 0; c <= 3; c++) {
          kimlikBirlestirmeleri.push({ s: { r: blokBas, c }, e: { r: blokSon, c } })
        }
      }
    }

    const rows: (string | number)[][] = [
      padRow(COLS, ['Personele Göre Kullanılan İzin Listesi']),
      padRow(COLS, [`Yıl: ${yil}`]),
      padRow(COLS, [`Oluşturulma tarihi: ${olusturmaTarihi}`]),
      padRow(COLS, [`Müdürlük: ${mudurlukMetin}  |  Tür: ${turMetin}  |  Durum: ${durumMetin}  |  Personel: ${personelMetin}`]),
      padRow(COLS, ['']),
      ...dataRows,
      padRow(COLS, [
        'Genel toplam',
        '',
        '',
        '',
        '',
        '',
        '',
        `${gruplar.length} personel / ${satirlar.length} kayıt`,
        satirlar.reduce((s, r) => s + r.gun, 0),
      ]),
    ]

    const ws = XLSX.utils.aoa_to_sheet(rows)
    const dataBas = 5
    const totalRow = dataBas + dataRows.length

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 8 } },
      { s: { r: totalRow, c: 0 }, e: { r: totalRow, c: 7 } },
      ...kimlikBirlestirmeleri,
    ]
    ws['!cols'] = [
      { wch: 8 },
      { wch: 14 },
      { wch: 28 },
      { wch: 32 },
      { wch: 12 },
      { wch: 12 },
      { wch: 22 },
      { wch: 14 },
      { wch: 14 },
    ]

    const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
    for (let r = 0; r <= range.e.r; r++) {
      for (let c = 0; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c })
        if (!ws[addr]) continue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cell = ws[addr] as any
        const isTitle = r <= 3
        const isHead = kisiBaslikSatirlari.has(r)
        const isTotal = r === totalRow
        const isKisiToplam = kisiToplamSatirlari.has(r)
        const inData = r >= dataBas && r <= totalRow
        const kimlikHucresi = r >= dataBas && r < totalRow && c <= 3 && !isHead
        cell.s = {
          font: { name: 'Calibri', sz: 11, bold: isTitle || isHead || isTotal || isKisiToplam },
          alignment: {
            vertical: 'center',
            horizontal: isTitle ? 'center' : c === 0 ? 'center' : c === 8 ? 'right' : 'left',
            wrapText: true,
          },
          ...(inData ? { border: THIN_BORDER } : {}),
        }
        if (isHead) {
          cell.s.fill = { patternType: 'solid', fgColor: { rgb: 'E5E7EB' } }
        } else if (isTotal) {
          cell.s.fill = { patternType: 'solid', fgColor: { rgb: 'F1F5F9' } }
        }
        if (kimlikHucresi) {
          cell.s.alignment = {
            vertical: 'center',
            horizontal: c === 0 ? 'center' : 'left',
            wrapText: true,
          }
        }
      }
    }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Izin Listesi')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const filename = `Personele_Gore_Kullanilan_Izin_Listesi_${yil}.xlsx`
    const encodedFilename = encodeURIComponent(filename)
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Personele_Gore_Kullanilan_Izin_Listesi.xlsx"; filename*=UTF-8''${encodedFilename}`,
      },
    })
  } catch (err) {
    console.error('PERSONELE_GORE_IZIN_LISTESI_EXCEL_HATA', err)
    return NextResponse.json({ error: 'Excel olusturulamadi.' }, { status: 500 })
  }
}
