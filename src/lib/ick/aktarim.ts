import ExcelJS from 'exceljs'
import { mudurlukEslesmeBaz } from '@/lib/organizasyon-birim'
import { trNormalize } from '@/lib/turkce-search'
import {
  ICK_ESLEME_YOK,
  ickBeyanDurumCoz,
  ickKodNorm,
  ickTerminCoz,
  type IckBeyanDurum,
  type IckIsbirligiKapsam,
  type IckTerminTipi,
} from '@/lib/ick/tanim'

export type IckAktarimGsSatir = {
  satir: number
  kod: string
  genelSartId: number | null
  mevcutDurum: string
  guvence: 'makul_guvence' | 'eylem_gerekli'
  aciklama: string
  hatalar: string[]
}

export type IckAktarimEylemSatir = {
  satir: number
  genelSartKod: string
  genelSartId: number | null
  kod: string
  kodNorm: string
  ongorulenEylem: string
  sorumluMetin: string
  sorumluTur: 'mudurluk' | 'ust_yonetim'
  sorumluMudurlukId: number | null
  isbirligiMetin: string
  isbirligiKapsam: IckIsbirligiKapsam
  isbirligiMudurlukIdleri: number[]
  cikti: string
  terminMetin: string
  terminTipi: IckTerminTipi | null
  terminIlk: string | null
  aciklama: string
  hatalar: string[]
}

export type IckAktarimGerceklesmeSatir = {
  satir: number
  kod: string
  kodNorm: string
  yil: number
  durumMetin: string
  durum: IckBeyanDurum | null
  calisma: string
  kanit: string
  degerlendirme: string
  sonuc: string
  hatalar: string[]
}

export type IckAktarimOnizleme = {
  genelSartlar: IckAktarimGsSatir[]
  eylemler: IckAktarimEylemSatir[]
  gerceklesmeler: IckAktarimGerceklesmeSatir[]
  /** Elle eşlenmesi gereken müdürlük adları (sorumlu veya işbirliği) */
  eslesmeyenAdlar: string[]
  genelHatalar: string[]
  hataSayisi: number
}

type Mudurluk = { id: number; mudurluk_adi: string }
type GenelSart = { id: number; kod: string }

function hucre(v: ExcelJS.CellValue): string {
  if (v == null) return ''
  if (typeof v === 'object') {
    if ('richText' in v) return v.richText.map(p => p.text).join('').trim()
    if ('text' in v) return String(v.text).trim()
    if ('result' in v) return String(v.result ?? '').trim()
    if (v instanceof Date) return v.toISOString().slice(0, 10)
  }
  return String(v).trim()
}

function sayfaSatirlari(ws: ExcelJS.Worksheet | undefined): { satir: number; deger: Record<string, string> }[] {
  if (!ws) return []
  const basliklar: string[] = []
  ws.getRow(1).eachCell({ includeEmpty: true }, (c, i) => {
    basliklar[i] = trNormalize(hucre(c.value))
  })
  const sonuc: { satir: number; deger: Record<string, string> }[] = []
  ws.eachRow((row, no) => {
    if (no === 1) return
    const deger: Record<string, string> = {}
    let dolu = false
    row.eachCell({ includeEmpty: true }, (c, i) => {
      const b = basliklar[i]
      if (!b) return
      deger[b] = hucre(c.value)
      if (deger[b]) dolu = true
    })
    if (dolu) sonuc.push({ satir: no, deger })
  })
  return sonuc
}

function al(d: Record<string, string>, ...adlar: string[]): string {
  for (const a of adlar) {
    const v = d[trNormalize(a)]
    if (v) return v
  }
  return ''
}

function mudurlukAdiMi(ad: string): boolean {
  const n = trNormalize(ad)
  return /mudurlugu|baskanligi|kurulu/.test(n)
}

function tumMudurluklerMi(ad: string): boolean {
  return /^tum (mudurlukler|birimler)$/.test(trNormalize(ad))
}

function ustYonetimMi(ad: string): boolean {
  return trNormalize(ad).startsWith('ust yonetim')
}

export async function ickAktarimOnizle(
  dosya: ArrayBuffer,
  planBasYil: number,
  mudurlukler: Mudurluk[],
  genelSartlar: GenelSart[],
  eslesme: Record<string, string>,
): Promise<IckAktarimOnizleme> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(dosya)
  const genelHatalar: string[] = []
  const gsSayfa = wb.getWorksheet('GenelSartlar')
  const eSayfa = wb.getWorksheet('Eylemler')
  const gSayfa = wb.getWorksheet('Gerceklesmeler')
  if (!eSayfa) genelHatalar.push('"Eylemler" sayfası bulunamadı.')

  const gsHarita = new Map(genelSartlar.map(g => [g.kod, g.id]))
  const mudHarita = new Map<string, number>()
  for (const m of mudurlukler) mudHarita.set(mudurlukEslesmeBaz(m.mudurluk_adi), m.id)
  const eslesmeyen = new Set<string>()

  function mudurlukBul(ad: string): number | null | 'yok' {
    const otomatik = mudHarita.get(mudurlukEslesmeBaz(ad))
    if (otomatik) return otomatik
    eslesmeyen.add(ad)
    const elle = eslesme[ad]
    if (elle === ICK_ESLEME_YOK) return 'yok'
    if (elle && Number(elle) > 0) return Number(elle)
    return null
  }

  const gsSatirlari: IckAktarimGsSatir[] = sayfaSatirlari(gsSayfa).map(({ satir, deger }) => {
    const kod = al(deger, 'Genel Şart Kodu')
    const guvenceMetin = trNormalize(al(deger, 'Güvence'))
    const hatalar: string[] = []
    const genelSartId = gsHarita.get(kod) ?? null
    if (!genelSartId) hatalar.push(`Genel şart "${kod}" mevzuat listesinde yok.`)
    let guvence: IckAktarimGsSatir['guvence'] = 'eylem_gerekli'
    if (guvenceMetin.startsWith('makul')) guvence = 'makul_guvence'
    else if (!guvenceMetin.startsWith('eylem')) hatalar.push('Güvence "Makul güvence" veya "Eylem gerekli" olmalı.')
    return {
      satir,
      kod,
      genelSartId,
      mevcutDurum: al(deger, 'Mevcut Durum'),
      guvence,
      aciklama: al(deger, 'Açıklama'),
      hatalar,
    }
  })
  const gsTekrar = new Set<string>()
  for (const g of gsSatirlari) {
    if (gsTekrar.has(g.kod)) g.hatalar.push('Genel şart iki kez yazılmış.')
    gsTekrar.add(g.kod)
  }

  const kodlar = new Set<string>()
  const eylemler: IckAktarimEylemSatir[] = sayfaSatirlari(eSayfa).map(({ satir, deger }) => {
    const hatalar: string[] = []
    const genelSartKod = al(deger, 'Genel Şart Kodu')
    const genelSartId = gsHarita.get(genelSartKod) ?? null
    if (!genelSartId) hatalar.push(`Genel şart "${genelSartKod}" mevzuat listesinde yok.`)
    const kod = al(deger, 'Eylem Kodu')
    const kodNorm = ickKodNorm(kod)
    if (!kod) hatalar.push('Eylem kodu boş.')
    else if (kodlar.has(kodNorm)) hatalar.push(`Eylem kodu "${kodNorm}" iki kez yazılmış.`)
    kodlar.add(kodNorm)
    const ongorulenEylem = al(deger, 'Öngörülen Eylem', 'Öngörülen Eylem veya Eylemler')
    if (!ongorulenEylem) hatalar.push('Öngörülen eylem boş.')

    const sorumluMetin = al(deger, 'Sorumlu Birim', 'Sorumlu Birim veya Çalışma Grubu Üyeleri')
    let sorumluTur: IckAktarimEylemSatir['sorumluTur'] = 'mudurluk'
    let sorumluMudurlukId: number | null = null
    if (!sorumluMetin) hatalar.push('Sorumlu birim boş.')
    else if (ustYonetimMi(sorumluMetin)) sorumluTur = 'ust_yonetim'
    else {
      const bulunan = mudurlukBul(sorumluMetin)
      if (typeof bulunan === 'number') sorumluMudurlukId = bulunan
      else {
        hatalar.push(`Sorumlu "${sorumluMetin}" müdürlük tanımında bulunamadı; elle eşleyin.`)
      }
    }

    const isbirligiMetin = al(deger, 'İşbirliği Yapılacak Birim')
    const parcalar = isbirligiMetin.split(/[;,]/).map(s => s.trim()).filter(Boolean)
    const isbirligiMudurlukIdleri: number[] = []
    let tum = false
    for (const p of parcalar) {
      if (tumMudurluklerMi(p)) {
        tum = true
        continue
      }
      if (!mudurlukAdiMi(p)) continue
      const bulunan = mudurlukBul(p)
      if (typeof bulunan === 'number') {
        if (!isbirligiMudurlukIdleri.includes(bulunan) && bulunan !== sorumluMudurlukId) isbirligiMudurlukIdleri.push(bulunan)
      } else if (bulunan === null) {
        hatalar.push(`İşbirliği "${p}" müdürlük tanımında bulunamadı; elle eşleyin veya eşlemesiz bırakın.`)
      }
    }
    const isbirligiKapsam: IckIsbirligiKapsam = tum ? 'tum_mudurlukler' : isbirligiMudurlukIdleri.length ? 'ilgili_mudurlukler' : 'yok'

    const terminMetin = al(deger, 'Tamamlanma Tarihi', 'Termin')
    const termin = ickTerminCoz(terminMetin, planBasYil)
    if (!termin.ok) hatalar.push(termin.hata)

    return {
      satir,
      genelSartKod,
      genelSartId,
      kod,
      kodNorm,
      ongorulenEylem,
      sorumluMetin,
      sorumluTur,
      sorumluMudurlukId,
      isbirligiMetin,
      isbirligiKapsam,
      isbirligiMudurlukIdleri,
      cikti: al(deger, 'Çıktı / Sonuç', 'Çıktı'),
      terminMetin,
      terminTipi: termin.ok ? termin.tip : null,
      terminIlk: termin.ok ? termin.ilk : null,
      aciklama: al(deger, 'Açıklama'),
      hatalar,
    }
  })

  for (const g of gsSatirlari) {
    const eylemVar = eylemler.some(e => e.genelSartKod === g.kod)
    if (g.guvence === 'makul_guvence' && eylemVar) g.hatalar.push('Makul güvence yazılmış ama bu genel şarta eylem bağlı.')
    if (g.guvence === 'eylem_gerekli' && !eylemVar) g.hatalar.push('Eylem gerekli yazılmış ama bu genel şarta eylem yok.')
  }

  const gerceklesmeler: IckAktarimGerceklesmeSatir[] = sayfaSatirlari(gSayfa).map(({ satir, deger }) => {
    const hatalar: string[] = []
    const kod = al(deger, 'Eylem Kodu')
    const kodNorm = ickKodNorm(kod)
    if (!kodlar.has(kodNorm)) hatalar.push(`"${kodNorm}" Eylemler sayfasında yok.`)
    const yil = Number(al(deger, 'Yıl'))
    if (!Number.isInteger(yil) || yil < 2000) hatalar.push('Yıl okunamadı.')
    const durumMetin = al(deger, 'Durum')
    const durum = ickBeyanDurumCoz(durumMetin)
    if (!durum) hatalar.push('Durum "Tamamlandı", "Devam Ediyor" veya "Başlanmadı" olmalı.')
    const calisma = al(deger, 'Gerçekleştirilen Çalışma')
    if (!calisma) hatalar.push('Gerçekleştirilen çalışma boş.')
    return {
      satir,
      kod,
      kodNorm,
      yil,
      durumMetin,
      durum,
      calisma,
      kanit: al(deger, 'Kanıtlayıcı Belge / Çıktı'),
      degerlendirme: al(deger, 'İzleme Değerlendirmesi'),
      sonuc: al(deger, 'Sonuç'),
      hatalar,
    }
  })

  const hataSayisi =
    genelHatalar.length +
    gsSatirlari.reduce((t, s) => t + s.hatalar.length, 0) +
    eylemler.reduce((t, s) => t + s.hatalar.length, 0) +
    gerceklesmeler.reduce((t, s) => t + s.hatalar.length, 0)

  return {
    genelSartlar: gsSatirlari,
    eylemler,
    gerceklesmeler,
    eslesmeyenAdlar: [...eslesmeyen].sort((a, b) => a.localeCompare(b, 'tr')),
    genelHatalar,
    hataSayisi,
  }
}
