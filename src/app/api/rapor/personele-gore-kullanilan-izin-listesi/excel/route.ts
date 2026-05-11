import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'
import {
  kadroBaslangic,
  kadroSatirAktifMi,
  type KadroRaporRow,
} from '@/lib/rapor-statuye-gore-cinsiyet'

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

function formatTarih(s: string | null | undefined): string {
  if (!s) return ''
  const d = s.slice(0, 10)
  const [y, m, g] = d.split('-')
  if (!y || !m || !g) return d
  return `${g}.${m}.${y}`
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
    const today = new Date().toISOString().slice(0, 10)

    const [{ data: kadroRaw }, { data: calisanRaw }, { data: izinRaw }] = await Promise.all([
      supabase
        .from('kadro_hareketleri')
        .select('asil, kadro_mudurlugu, gorev_mudurlugu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu')
        .not('asil', 'is', null),
      supabase.from('calisan').select('sicil_no, ad_soyad'),
      supabase
        .from('izin_hareketleri')
        .select('sicil_no, tur, ayrilis, baslama, gun, durum')
        .neq('durum', 'İptal Edildi')
        .gte('ayrilis', `${yil}-01-01`)
        .lte('ayrilis', `${yil}-12-31`),
    ])

    const byAsil = new Map<string, KadroRaporRow[]>()
    for (const r of kadroRaw ?? []) {
      const asil = String(r.asil ?? '').trim()
      if (!asil) continue
      const list = byAsil.get(asil) ?? []
      list.push(r as KadroRaporRow)
      byAsil.set(asil, list)
    }

    const mudurlukBySicil = new Map<string, string>()
    for (const [sicil, rows] of byAsil) {
      const aktif = rows.filter(r => kadroSatirAktifMi(r, today))
      if (aktif.length === 0) {
        const sorted = [...rows].sort((a, b) => kadroBaslangic(b).localeCompare(kadroBaslangic(a)))
        const latest = sorted[0]
        if (latest) {
          mudurlukBySicil.set(sicil, String(latest.kadro_mudurlugu ?? latest.gorev_mudurlugu ?? '').trim())
        }
        continue
      }
      const secilen = aktif.reduce((a, b) => (kadroBaslangic(a) >= kadroBaslangic(b) ? a : b))
      mudurlukBySicil.set(sicil, String(secilen.kadro_mudurlugu ?? secilen.gorev_mudurlugu ?? '').trim())
    }

    const calisanBySicil = new Map<string, { sicil_no: string; ad_soyad: string }>()
    for (const c of calisanRaw ?? []) {
      calisanBySicil.set(c.sicil_no, { sicil_no: c.sicil_no, ad_soyad: c.ad_soyad })
    }

    interface SatirRow {
      sicil_no: string
      ad_soyad: string
      mudurluk: string
      kayit_bilgisi: string
      tur: string
      gun: number
    }

    let satirlar: SatirRow[] = []
    for (const iz of izinRaw ?? []) {
      const sicil = String(iz.sicil_no ?? '').trim()
      if (!sicil) continue
      const gun = Number(iz.gun ?? 0)
      if (!Number.isFinite(gun) || gun <= 0) continue
      const calisan = calisanBySicil.get(sicil)
      if (!calisan) continue
      const mudurluk = mudurlukBySicil.get(sicil) ?? ''
      const ayrilis = formatTarih(iz.ayrilis)
      const baslama = formatTarih(iz.baslama)
      const kayit_bilgisi = ayrilis && baslama ? `${ayrilis} – ${baslama}` : ayrilis || baslama || '—'
      satirlar.push({
        sicil_no: sicil,
        ad_soyad: calisan.ad_soyad,
        mudurluk,
        kayit_bilgisi,
        tur: String(iz.tur ?? '').trim(),
        gun,
      })
    }

    satirlar.sort((a, b) => {
      const s = a.sicil_no.localeCompare(b.sicil_no, 'tr', { numeric: true })
      if (s !== 0) return s
      const ayrilisA = a.kayit_bilgisi.slice(0, 10).split('.').reverse().join('')
      const ayrilisB = b.kayit_bilgisi.slice(0, 10).split('.').reverse().join('')
      return ayrilisA.localeCompare(ayrilisB)
    })

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

    const mudurlukMetin = mudurlukFilterler.length ? mudurlukFilterler.join(', ') : 'Tümü'
    const turMetin = turFiltre || 'Tümü'
    const olusturmaTarihi = new Date().toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    const COLS = 6
    const rows: (string | number)[][] = [
      padRow(COLS, ['Personele Göre Kullanılan İzin Listesi']),
      padRow(COLS, [`Yıl: ${yil}`]),
      padRow(COLS, [`Oluşturulma tarihi: ${olusturmaTarihi}`]),
      padRow(COLS, [`Müdürlük filtresi: ${mudurlukMetin}  |  Tür filtresi: ${turMetin}`]),
      padRow(COLS, ['']),
      padRow(COLS, ['Sıra No', 'Sicil No', 'Adı Soyadı', 'Kayıt Bilgisi', 'İzin Türü', 'Gün Bilgisi']),
      ...satirlar.map((s, i) =>
        padRow(COLS, [i + 1, s.sicil_no, s.ad_soyad, s.kayit_bilgisi, s.tur, s.gun]),
      ),
      padRow(COLS, ['Toplam', '', '', '', '', satirlar.length]),
    ]

    const ws = XLSX.utils.aoa_to_sheet(rows)
    const headerRow = 5
    const dataStart = 6
    const totalRow = dataStart + satirlar.length

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 5 } },
      { s: { r: totalRow, c: 0 }, e: { r: totalRow, c: 4 } },
    ]
    ws['!cols'] = [{ wch: 8 }, { wch: 14 }, { wch: 30 }, { wch: 24 }, { wch: 24 }, { wch: 12 }]

    const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
    for (let r = 0; r <= range.e.r; r++) {
      for (let c = 0; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c })
        if (!ws[addr]) continue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cell = ws[addr] as any
        const isTitle = r <= 3
        const isHead = r === headerRow
        const isTotal = r === totalRow
        const inData = r >= headerRow && r <= totalRow
        cell.s = {
          font: { name: 'Calibri', sz: 11, bold: isTitle || isHead || isTotal },
          alignment: {
            vertical: 'center',
            horizontal: isTitle ? 'center' : c === 0 ? 'center' : c === 5 ? 'right' : 'left',
            wrapText: true,
          },
          ...(inData ? { border: THIN_BORDER } : {}),
        }
        if (isHead) {
          cell.s.fill = { patternType: 'solid', fgColor: { rgb: 'E5E7EB' } }
        } else if (isTotal) {
          cell.s.fill = { patternType: 'solid', fgColor: { rgb: 'F1F5F9' } }
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
