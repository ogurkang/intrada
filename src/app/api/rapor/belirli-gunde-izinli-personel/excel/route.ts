import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'
import {
  kadroBaslangic,
  kadroSatirAktifMi,
  type KadroRaporRow,
} from '@/lib/rapor-statuye-gore-cinsiyet'
import {
  mudurlukKonumHaritasi,
  type TanimMudurlukKonumRow,
} from '@/lib/rapor-konuma-gore-cinsiyet'
import { applyGridBorders, mergeSatir } from '@/lib/kesintiler-excel'

function formatTarih(s: string | null | undefined): string {
  if (!s) return '—'
  const d = String(s).slice(0, 10)
  const [y, m, g] = d.split('-')
  if (!y || !m || !g) return d
  return `${g}.${m}.${y}`
}

function normMudStr(v: string | null | undefined): string {
  return String(v ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('tr-TR')
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tarih = searchParams.get('tarih') ?? new Date().toISOString().slice(0, 10)
  const konumFiltre = searchParams.get('konum') ?? ''
  const mudurlukParam = searchParams.get('m') ?? ''
  const turParam = searchParams.get('t') ?? ''
  const sicilParam = searchParams.get('s') ?? ''

  if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih)) {
    return NextResponse.json({ error: 'Geçersiz tarih formatı' }, { status: 400 })
  }

  const supabase = await createClient()

  const [{ data: izinRaw }, { data: calisanRaw }, { data: kadroRaw }, { data: mudRaw }] =
    await Promise.all([
      supabase
        .from('izin_hareketleri')
        .select('sicil_no, tur, ayrilis, baslama, durum')
        .neq('durum', 'İptal Edildi')
        .lte('ayrilis', tarih)
        .gt('baslama', tarih)
        .order('sicil_no'),
      (supabase.from('calisan').select('sicil_no, ad_soyad, gorev_turu, gorevlendirilen_kurum') as any),
      supabase
        .from('kadro_hareketleri')
        .select('asil, statu, kadro_mudurlugu, gorev_mudurlugu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu')
        .not('asil', 'is', null),
      supabase.from('tanim_mudurluk').select('mudurluk_adi, konum, sira_no').eq('aktif', true),
    ])

  const calisanArr: { sicil_no: string; ad_soyad: string | null; gorev_turu: string | null; gorevlendirilen_kurum: string | null }[] =
    (calisanRaw ?? []) as any

  const adMap = new Map(calisanArr.map(c => [c.sicil_no, c.ad_soyad ?? c.sicil_no]))
  const kurumMap = new Map(
    calisanArr
      .filter(c => c.gorev_turu === 'Kurum Görevlendirme' && c.gorevlendirilen_kurum)
      .map(c => [c.sicil_no, c.gorevlendirilen_kurum ?? '']),
  )

  const mudurlukKonum = mudurlukKonumHaritasi((mudRaw ?? []) as TanimMudurlukKonumRow[])

  const byAsil = new Map<string, KadroRaporRow[]>()
  for (const r of kadroRaw ?? []) {
    const asil = String(r.asil ?? '').trim()
    if (!asil) continue
    const list = byAsil.get(asil) ?? []
    list.push(r as KadroRaporRow)
    byAsil.set(asil, list)
  }

  const mudurlukBySicil = new Map<string, string>()
  const statuBySicil = new Map<string, string>()

  for (const [sicil, rows] of byAsil) {
    const aktif = rows.filter(r => kadroSatirAktifMi(r, tarih))
    const hedef =
      aktif.length > 0
        ? aktif.reduce((a, b) => (kadroBaslangic(a) >= kadroBaslangic(b) ? a : b))
        : [...rows].sort((a, b) => kadroBaslangic(b).localeCompare(kadroBaslangic(a)))[0]
    if (hedef) {
      mudurlukBySicil.set(sicil, String(hedef.kadro_mudurlugu ?? hedef.gorev_mudurlugu ?? '').trim())
      statuBySicil.set(sicil, String((hedef as any).statu ?? '').trim())
    }
  }

  const mudurlukSet = mudurlukParam ? new Set(mudurlukParam.split(',').map(m => m.trim()).filter(Boolean)) : null
  const sicilTrim = sicilParam.trim().toLocaleLowerCase('tr-TR')

  const satirlar: {
    sicil_no: string
    ad_soyad: string
    statu: string
    mudurluk: string
    gorevlendirilen_kurum: string
    konum: string
    tur: string
    ayrilis: string
    baslama: string
  }[] = []

  for (const iz of izinRaw ?? []) {
    const sicil = String(iz.sicil_no ?? '').trim()
    if (!sicil) continue
    const mudurluk = mudurlukBySicil.get(sicil) ?? ''
    const konum = mudurlukKonum.get(normMudStr(mudurluk)) ?? ''
    if (konumFiltre && konum !== konumFiltre) continue
    if (mudurlukSet && !mudurlukSet.has(mudurluk)) continue
    if (turParam && iz.tur !== turParam) continue
    if (sicilTrim && !sicil.toLocaleLowerCase('tr-TR').includes(sicilTrim) && !(adMap.get(sicil) ?? '').toLocaleLowerCase('tr-TR').includes(sicilTrim)) continue
    satirlar.push({
      sicil_no: sicil,
      ad_soyad: adMap.get(sicil) ?? sicil,
      statu: statuBySicil.get(sicil) ?? '',
      mudurluk,
      gorevlendirilen_kurum: kurumMap.get(sicil) ?? '',
      konum,
      tur: String(iz.tur ?? '').trim(),
      ayrilis: formatTarih(iz.ayrilis),
      baslama: formatTarih(iz.baslama),
    })
  }

  satirlar.sort((a, b) => a.sicil_no.localeCompare(b.sicil_no, 'tr', { numeric: true }))

  const baslikMetin = `Belirli Günde İzinli Olan Personel Listesi — ${formatTarih(tarih)}`
  const filtreBilgisi = [
    konumFiltre ? `Konum: ${konumFiltre}` : '',
    mudurlukParam ? `Müdürlük filtresi uygulandı` : '',
    turParam ? `İzin türü: ${turParam}` : '',
    sicilTrim ? `Arama: ${sicilParam}` : '',
  ].filter(Boolean).join(' | ')

  const headers = ['Sıra No', 'Sicil No', 'Adı Soyadı', 'Statü', 'Müdürlük', 'Görevlendirildiği Kurum', 'Konum', 'İzin Türü', 'Ayrılış', 'Başlama']
  const colCount = headers.length
  const rows: (string | number | XLSX.CellObject)[][] = []
  const mergeRows: number[] = []

  rows.push(mergeSatir(baslikMetin, colCount, { bold: true }))
  mergeRows.push(rows.length - 1)
  if (filtreBilgisi) {
    rows.push(mergeSatir(filtreBilgisi, colCount))
    mergeRows.push(rows.length - 1)
  }
  rows.push(headers)

  if (satirlar.length === 0) {
    rows.push(Array(colCount).fill('').map((_, i) => (i === 2 ? 'Kayıt Yok' : '')))
  } else {
    satirlar.forEach((s, i) => {
      rows.push([i + 1, s.sicil_no, s.ad_soyad, s.statu, s.mudurluk, s.gorevlendirilen_kurum, s.konum, s.tur, s.ayrilis, s.baslama])
    })
    rows.push([
      '',
      '',
      `Toplam: ${satirlar.length} kayıt`,
      '', '', '', '', '', '', '',
    ])
  }

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!merges'] = mergeRows.map(r => ({ s: { r, c: 0 }, e: { r, c: colCount - 1 } }))
  ws['!cols'] = [
    { wch: 8 },
    { wch: 10 },
    { wch: 28 },
    { wch: 14 },
    { wch: 28 },
    { wch: 24 },
    { wch: 8 },
    { wch: 22 },
    { wch: 12 },
    { wch: 12 },
  ]
  applyGridBorders(ws, rows.length, colCount)

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'İzinli Personel')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true })

  const tarihDosya = tarih.replace(/-/g, '')
  const safeName = `Izinli_Personel_${tarihDosya}`
  const encodedFilename = encodeURIComponent(`${safeName}.xlsx`)

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${safeName}.xlsx"; filename*=UTF-8''${encodedFilename}`,
    },
  })
}
