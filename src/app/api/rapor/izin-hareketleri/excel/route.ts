import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'

function parsePozitifInt(v: string | null): number | null {
  if (!v) return null
  const n = Number.parseInt(v, 10)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

function tarihFmt(v: string | null) {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('tr-TR')
}

function jsonArrayToNumberList(v: unknown): number[] {
  if (!Array.isArray(v)) return []
  const out: number[] = []
  for (const x of v) {
    const n = typeof x === 'number' ? x : Number.parseInt(String(x), 10)
    if (Number.isFinite(n)) out.push(n)
  }
  return out
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const gecmisId = parsePozitifInt(searchParams.get('gecmisId'))
    const yil = parsePozitifInt(searchParams.get('yil'))
    const siraBas = parsePozitifInt(searchParams.get('siraBas'))
    const siraBit = parsePozitifInt(searchParams.get('siraBit'))

    let alt: number | null = null
    let ust: number | null = null
    let izinIdsFromLog: number[] | null = null
    let yilResolved: number | null = yil

    if (gecmisId != null) {
      const { data: logRow, error: logErr } = await supabase
        .from('rapor_izin_excel_gecmis')
        .select('id, user_id, yil, sira_bas, sira_bit, izin_ids')
        .eq('id', gecmisId)
        .maybeSingle()
      if (logErr) return NextResponse.json({ error: logErr.message }, { status: 500 })
      if (!logRow || logRow.user_id !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      yilResolved = logRow.yil
      alt = logRow.sira_bas
      ust = logRow.sira_bit
      izinIdsFromLog = jsonArrayToNumberList(logRow.izin_ids)
    } else {
      if (yil == null || siraBas == null || siraBit == null) {
        return NextResponse.json({ error: 'Geçersiz parametre.' }, { status: 400 })
      }
      alt = Math.min(siraBas, siraBit)
      ust = Math.max(siraBas, siraBit)
    }
    if (yilResolved == null || alt == null || ust == null) {
      return NextResponse.json({ error: 'Geçersiz parametre.' }, { status: 400 })
    }

    const [{ data: izinRaw, error: izinErr }, { data: calisanRaw }] = await Promise.all([
      supabase
        .from('izin_hareketleri')
        .select('id, yil, sira_no, sicil_no, tur, ayrilis, baslama, gun, durum, islem_yapan, kayit_tarihi')
        .eq('yil', yilResolved),
      supabase.from('calisan').select('sicil_no, ad_soyad'),
    ])
    if (izinErr) return NextResponse.json({ error: izinErr.message }, { status: 500 })

    const adMap = new Map((calisanRaw ?? []).map(c => [c.sicil_no, c.ad_soyad ?? c.sicil_no]))
    const secili = (izinRaw ?? [])
      .filter(r => {
        if (izinIdsFromLog && izinIdsFromLog.length > 0) return izinIdsFromLog.includes(r.id)
        const s = parsePozitifInt(r.sira_no)
        return s != null && s >= alt! && s <= ust!
      })
      .sort((a, b) => {
        const sa = parsePozitifInt(a.sira_no) ?? -1
        const sb = parsePozitifInt(b.sira_no) ?? -1
        if (sa !== sb) return sa - sb
        return a.id - b.id
      })

    const rows: (string | number)[][] = [
      ['İzin Hareketleri Raporu'],
      [`Yıl: ${yilResolved} · Sıra Aralığı: ${alt}-${ust}`],
      [''],
      ['Sıra No', 'Sicil No', 'Ad Soyad', 'Tür', 'Ayrılış', 'Başlama', 'Gün', 'Durum', 'İşlem Yapan', 'Kayıt Tarihi'],
      ...secili.map(r => [
        `${r.yil}/${r.sira_no ?? '—'}`,
        r.sicil_no,
        adMap.get(r.sicil_no) ?? r.sicil_no,
        r.tur,
        tarihFmt(r.ayrilis),
        tarihFmt(r.baslama),
        r.gun,
        r.durum,
        r.islem_yapan ?? '—',
        tarihFmt(r.kayit_tarihi),
      ]),
    ]

    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
    ]
    ws['!cols'] = [
      { wch: 12 },
      { wch: 10 },
      { wch: 24 },
      { wch: 18 },
      { wch: 12 },
      { wch: 12 },
      { wch: 6 },
      { wch: 12 },
      { wch: 16 },
      { wch: 14 },
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
        cell.s = {
          font: { name: 'Calibri', sz: 11, bold: isTitle || isHead },
          alignment: { vertical: 'center', horizontal: c <= 1 || c === 6 ? 'center' : 'left', wrapText: true },
          border: {
            top: { style: 'thin', color: { rgb: 'D1D5DB' } },
            bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
            left: { style: 'thin', color: { rgb: 'D1D5DB' } },
            right: { style: 'thin', color: { rgb: 'D1D5DB' } },
          },
        }
        if (isHead) cell.s.fill = { patternType: 'solid', fgColor: { rgb: 'E5E7EB' } }
      }
    }

    // Log sadece yeni indirmede yazılır (geçmişten indir tekrarında yazma)
    if (gecmisId == null) {
      await supabase.from('rapor_izin_excel_gecmis').insert({
        user_id: user.id,
        actor_email: user.email ?? null,
        yil: yilResolved,
        sira_bas: alt,
        sira_bit: ust,
        kayit_sayisi: secili.length,
        izin_ids: secili.map(x => x.id),
      })
    }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Izin Hareketleri')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const filename = `Izin_Hareketleri_${yilResolved}_${alt}-${ust}.xlsx`
    const encodedFilename = encodeURIComponent(filename)

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Izin_Hareketleri_Raporu.xlsx"; filename*=UTF-8''${encodedFilename}`,
      },
    })
  } catch (err) {
    console.error('IZIN_HAREKETLERI_EXCEL_HATA', err)
    return NextResponse.json({ error: 'Excel oluşturulamadı.' }, { status: 500 })
  }
}
