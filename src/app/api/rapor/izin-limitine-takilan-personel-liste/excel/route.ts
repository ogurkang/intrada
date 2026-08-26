import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'
import { fetchAllKadroHareketleri, fetchAllPaged } from '@/lib/supabase-sayfala'
import {
  ayAraligi,
  periyotSonGunu,
  yilAraligi,
  type CalisanRaporRow,
  type KadroRaporRow,
  type RaporPeriyot,
  type TanimStatuRow,
} from '@/lib/rapor-statuye-gore-cinsiyet'
import { izinLimitineTakilanPersonelListeSnapshot } from '@/lib/rapor-izin-limitine-takilan-personel-liste'

const AYLAR_TR = ['Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran', 'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik']
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

function satirRgb(kullanilan: number) {
  const oran = Math.max(0, Math.min(1, kullanilan / 50))
  const g = Math.round(255 - (255 - 202) * oran)
  const b = Math.round(255 - (255 - 202) * oran)
  return `FF${g.toString(16).padStart(2, '0').toUpperCase()}${b.toString(16).padStart(2, '0').toUpperCase()}`
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

    const [{ data: tanimStatuRaw }, kadroRes, { data: calisanRaw }, { data: izinRaw }] = await Promise.all([
      supabase.from('tanim_statu').select('statu_adi, sira_no').eq('aktif', true),
      fetchAllKadroHareketleri<KadroRaporRow>(
        supabase,
        'asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu, kadro_mudurlugu, gorev_mudurlugu',
      ),
      supabase.from('calisan').select('sicil_no, ad_soyad, cinsiyet'),
      fetchAllPaged<{ sicil_no: string | null; ayrilis: string | null; gun: number | null; tur: string | null }>((from, to) =>
        supabase
          .from('izin_hareketleri')
          .select('sicil_no, ayrilis, gun, tur')
          .neq('durum', 'İptal Edildi')
          .gte('ayrilis', `${yil}-01-01`)
          .lte('ayrilis', `${yil}-12-31`)
          .order('id')
          .range(from, to),
      ),
    ])

    const tanimStatuler: TanimStatuRow[] = (tanimStatuRaw ?? []).map(r => ({ statu_adi: r.statu_adi, sira_no: r.sira_no }))
    const kadro: KadroRaporRow[] = (kadroRes.data ?? []) as KadroRaporRow[]
    const calisanBySicil = new Map<string, CalisanRaporRow>()
    for (const c of calisanRaw ?? []) {
      calisanBySicil.set(c.sicil_no, { sicil_no: c.sicil_no, ad_soyad: c.ad_soyad, cinsiyet: c.cinsiyet })
    }

    const D = periyotSonGunu(yil, periyot)
    const aralik = periyot === 'yillik' ? yilAraligi(yil) : ayAraligi(yil, periyot as number)
    const label = periyot === 'yillik' ? 'YILLIK' : AYLAR_TR[(periyot as number) - 1]
    let satirlar = izinLimitineTakilanPersonelListeSnapshot({
      D,
      bas: aralik.bas,
      bit: aralik.bit,
      tanimStatuler,
      kadro,
      calisanBySicil,
      izinRows: (izinRaw ?? []) as Array<{ sicil_no: string | null; ayrilis: string | null; gun: number | null; tur: string | null }>,
    })
    if (mudurlukFilterler.length) {
      const set = new Set(mudurlukFilterler)
      satirlar = satirlar.filter(r => set.has(r.mudurluk))
    }

    const COLS = 5
    const rows: (string | number)[][] = [
      padRow(COLS, ['İzin Limitine Takılan Personel Listesi']),
      padRow(COLS, [`Yıl: ${yil} · Sekme: ${label}`]),
      padRow(COLS, [`Anlık görüntü tarihi: ${sonGunuMetin(D)}`]),
      padRow(COLS, [mudurlukFilterler.length ? `Müdürlük filtresi: ${mudurlukFilterler.join(', ')}` : 'Müdürlük filtresi: Tümü']),
      padRow(COLS, ['']),
      padRow(COLS, ['Sıra No', 'Sicil No', 'Adı Soyadı', 'Müdürlüğü', 'Kullanılan İzin']),
      ...satirlar.map((s, i) => padRow(COLS, [i + 1, s.sicil_no, s.ad_soyad, s.mudurluk, s.kullanilan_izin])),
      padRow(COLS, ['Toplam', '', '', '', satirlar.length]),
    ]

    const ws = XLSX.utils.aoa_to_sheet(rows)
    const headerRow = 5
    const dataStart = 6
    const totalRow = dataStart + satirlar.length
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 4 } },
      { s: { r: totalRow, c: 0 }, e: { r: totalRow, c: 3 } },
    ]
    ws['!cols'] = [{ wch: 8 }, { wch: 14 }, { wch: 30 }, { wch: 30 }, { wch: 16 }]

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
            horizontal: isTitle ? 'center' : c === 0 ? 'center' : c === 4 ? 'right' : 'left',
            wrapText: true,
          },
          ...(inData ? { border: THIN_BORDER } : {}),
        }
        if (isHead || isTotal) {
          cell.s.fill = { patternType: 'solid', fgColor: { rgb: isHead ? 'E5E7EB' : 'F1F5F9' } }
        }
        if (r >= dataStart && r < totalRow) {
          const satir = satirlar[r - dataStart]
          cell.s.fill = { patternType: 'solid', fgColor: { rgb: satirRgb(satir.kullanilan_izin) } }
        }
      }
    }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Izin Limiti Liste')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const filename = `Izin_Limitine_Takilan_Personel_Listesi_${yil}_${label}.xlsx`
    const encodedFilename = encodeURIComponent(filename)
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Izin_Limitine_Takilan_Personel_Listesi.xlsx"; filename*=UTF-8''${encodedFilename}`,
      },
    })
  } catch (err) {
    console.error('IZIN_LIMITINE_TAKILAN_PERSONEL_EXCEL_HATA', err)
    return NextResponse.json({ error: 'Excel olusturulamadi.' }, { status: 500 })
  }
}
