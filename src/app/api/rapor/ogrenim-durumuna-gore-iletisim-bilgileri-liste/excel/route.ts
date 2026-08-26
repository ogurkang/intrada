import { fetchAllCalisanOgrenim, fetchAllKadroHareketleri } from '@/lib/supabase-sayfala'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'
import {
  periyotSonGunu,
  type CalisanRaporRow,
  type KadroRaporRow,
  type RaporPeriyot,
  type TanimStatuRow,
} from '@/lib/rapor-statuye-gore-cinsiyet'
import {
  ogrenimDurumunaGoreIletisimBilgileriFlatten,
  ogrenimDurumunaGoreIletisimBilgileriListeSnapshot,
} from '@/lib/rapor-ogrenim-durumuna-gore-iletisim-bilgileri-liste'

const AYLAR_TR = ['Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran', 'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik']
const MIN_YIL = 2000
const MAX_YIL = 2035
const MERGE_COLS = 6

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

function parsePeriyot(v: string | null): RaporPeriyot {
  if (v === 'yillik') return 'yillik'
  const n = Number.parseInt(v ?? '', 10)
  if (Number.isFinite(n) && n >= 1 && n <= 12) return n as RaporPeriyot
  return 'yillik'
}

function sonGunuMetin(D: string): string {
  const [y, m, d] = D.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
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
    const periyot = parsePeriyot(searchParams.get('p'))
    const mudurlukFilterler = String(searchParams.get('m') ?? '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)

    const [{ data: tanimStatuRaw }, { data: kadroRaw }, { data: calisanRaw }, { data: ogrenimRaw }] = await Promise.all([
      supabase.from('tanim_statu').select('statu_adi, sira_no').eq('aktif', true),
      fetchAllKadroHareketleri(supabase, 'asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu, kadro_mudurlugu, gorev_mudurlugu', q => q.not('asil', 'is', null)),
      supabase.from('calisan').select('sicil_no, ad_soyad, cinsiyet, telefon, e_posta'),
      fetchAllCalisanOgrenim(supabase, 'sicil_no, ogrenim_turu, okul_adi, bolum, varsayilan, aktif'),
    ])

    const tanimStatuler: TanimStatuRow[] = (tanimStatuRaw ?? []).map(r => ({ statu_adi: r.statu_adi, sira_no: r.sira_no }))
    const kadro: KadroRaporRow[] = (kadroRaw ?? []) as KadroRaporRow[]
    const calisanBySicil = new Map<string, CalisanRaporRow>()
    const iletisimBySicil = new Map<string, { telefon?: string | null; e_posta?: string | null }>()
    for (const c of calisanRaw ?? []) {
      calisanBySicil.set(c.sicil_no, { sicil_no: c.sicil_no, ad_soyad: c.ad_soyad, cinsiyet: c.cinsiyet })
      iletisimBySicil.set(c.sicil_no, { telefon: c.telefon, e_posta: c.e_posta })
    }

    const D = periyotSonGunu(yil, periyot)
    const label = periyot === 'yillik' ? 'YILLIK' : AYLAR_TR[(periyot as number) - 1]
    const groups = ogrenimDurumunaGoreIletisimBilgileriListeSnapshot({
      D,
      tanimStatuler,
      kadro,
      calisanBySicil,
      iletisimBySicil,
      ogrenimRows: (ogrenimRaw ?? []) as Array<{
        sicil_no: string
        ogrenim_turu: string | null
        okul_adi: string | null
        bolum: string | null
        varsayilan: boolean | null
        aktif: boolean | null
      }>,
    })
    const mudurlukSet = new Set(mudurlukFilterler)
    const filteredGroups = mudurlukFilterler.length ? groups.filter(g => mudurlukSet.has(g.mudurluk)) : groups
    const satirlar = ogrenimDurumunaGoreIletisimBilgileriFlatten(filteredGroups)

    const COLS = 8
    const rows: (string | number)[][] = [
      padRow(COLS, ['Öğrenim Durumuna Göre İletişim Bilgileri Listesi']),
      padRow(COLS, [`Yıl: ${yil} · Sekme: ${label}`]),
      padRow(COLS, [`Anlık görüntü tarihi: ${sonGunuMetin(D)}`]),
      padRow(COLS, [mudurlukFilterler.length ? `Müdürlük filtresi: ${mudurlukFilterler.join(', ')}` : 'Müdürlük filtresi: Tümü']),
      padRow(COLS, ['']),
      padRow(COLS, ['Sıra No', 'Sicil No', 'Adı Soyadı', 'Müdürlüğü', 'Cep Telefonu', 'E-Posta', 'Öğrenim Durumu', 'Okul / Bölüm']),
      ...satirlar.map(s =>
        padRow(COLS, [
          s.sira_no,
          s.sicil_no,
          s.ad_soyad,
          s.mudurluk,
          s.telefon,
          s.e_posta,
          s.ogrenim_durumu,
          s.okul_bolum,
        ]),
      ),
      padRow(COLS, ['Toplam', '', '', '', '', '', '', filteredGroups.length]),
    ]

    const ws = XLSX.utils.aoa_to_sheet(rows)
    const headerRow = 5
    const dataStartRow = 6
    const totalRow = dataStartRow + satirlar.length
    const merges: XLSX.Range[] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: COLS - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: COLS - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: COLS - 1 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: COLS - 1 } },
      { s: { r: totalRow, c: 0 }, e: { r: totalRow, c: 6 } },
    ]

    let cursor = dataStartRow
    for (const s of satirlar) {
      if (!s.grup_ilk_satir) continue
      if (s.grup_satir_sayisi > 1) {
        const end = cursor + s.grup_satir_sayisi - 1
        for (let c = 0; c < MERGE_COLS; c++) {
          merges.push({ s: { r: cursor, c }, e: { r: end, c } })
        }
      }
      cursor += s.grup_satir_sayisi
    }
    ws['!merges'] = merges
    ws['!cols'] = [
      { wch: 8 },
      { wch: 14 },
      { wch: 28 },
      { wch: 28 },
      { wch: 16 },
      { wch: 28 },
      { wch: 20 },
      { wch: 36 },
    ]

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
            horizontal: isTitle ? 'center' : c === 0 ? 'center' : 'left',
            wrapText: true,
          },
          ...(inData ? { border: THIN_BORDER } : {}),
        }
        if (isHead || isTotal) {
          cell.s.fill = { patternType: 'solid', fgColor: { rgb: isHead ? 'E5E7EB' : 'F1F5F9' } }
        }
      }
    }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Ogrenim Iletisim Liste')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const filename = `Ogrenim_Durumuna_Gore_Iletisim_Bilgileri_Listesi_${yil}_${label}.xlsx`
    const encodedFilename = encodeURIComponent(filename)
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Ogrenim_Durumuna_Gore_Iletisim_Bilgileri_Listesi.xlsx"; filename*=UTF-8''${encodedFilename}`,
      },
    })
  } catch (err) {
    console.error('OGRENIM_DURUMUNA_GORE_ILETISIM_BILGILERI_EXCEL_HATA', err)
    return NextResponse.json({ error: 'Excel olusturulamadi.' }, { status: 500 })
  }
}
