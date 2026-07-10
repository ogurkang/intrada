/**
 * Ali Kazancı (180) — Sosyal Hak IZY aylık zincir doğrulaması
 * Beklenen tablo ile karşılaştırır.
 */
import {
  buildShakWindowsForYear,
  computeIzyRhKsdForShakMonths,
  computeIzyRhKsdShakMonthChain,
  izyRhPeakForSicilYear,
  izyRhToplamGun,
} from '../src/lib/kesinym-hesap.ts'

const sicil = '180'

const periods = [
  ['Ocak', '2025-12-15', '2026-01-14'],
  ['Şubat', '2026-01-15', '2026-02-14'],
  ['Mart', '2026-02-15', '2026-03-14'],
  ['Nisan', '2026-03-15', '2026-04-14'],
  ['Mayıs', '2026-04-15', '2026-05-14'],
  ['HAZİRAN', '2026-05-15', '2026-06-14'],
  ['TEMMUZ', '2026-06-15', '2026-07-14'],
]

const leaves = [
  { sira_no: '42', sicil_no: sicil, ad_soyad: 'Ali Kazancı', unvan: '', tur: 'Rapor', ayrilis: '2026-01-07', baslama: '2026-01-12', gun: 5 },
  { sira_no: '171', sicil_no: sicil, ad_soyad: 'Ali Kazancı', unvan: '', tur: 'Rapor', ayrilis: '2026-01-18', baslama: '2026-01-28', gun: 10 },
  { sira_no: '235', sicil_no: sicil, ad_soyad: 'Ali Kazancı', unvan: '', tur: 'Rapor', ayrilis: '2026-01-28', baslama: '2026-02-07', gun: 10 },
  { sira_no: '649', sicil_no: sicil, ad_soyad: 'Ali Kazancı', unvan: '', tur: 'Rapor', ayrilis: '2026-03-18', baslama: '2026-03-20', gun: 2 },
  { sira_no: '604', sicil_no: sicil, ad_soyad: 'Ali Kazancı', unvan: '', tur: 'Rapor', ayrilis: '2026-03-23', baslama: '2026-03-30', gun: 7 },
  { sira_no: '673', sicil_no: sicil, ad_soyad: 'Ali Kazancı', unvan: '', tur: 'Heyet Raporu', ayrilis: '2026-04-06', baslama: '2026-05-06', gun: 30 },
  { sira_no: '903', sicil_no: sicil, ad_soyad: 'Ali Kazancı', unvan: '', tur: 'Heyet Raporu', ayrilis: '2026-05-06', baslama: '2026-07-05', gun: 60 },
  { sira_no: '1299', sicil_no: sicil, ad_soyad: 'Ali Kazancı', unvan: '', tur: 'Heyet Raporu', ayrilis: '2026-07-06', baslama: '2026-08-06', gun: 31 },
]

const expected = {
  Ocak: { OD: 0, izin: 5, RB: 5, K: 0, SD: 0 },
  Şubat: { OD: 0, izin: 20, RB: 25, K: 0, SD: 0 },
  Mart: { OD: 0, izin: 0, RB: 25, K: 0, SD: 0 },
  Nisan: { OD: 0, izin: 39, RB: 64, K: 30, SD: 34 },
  Mayıs: { OD: 34, izin: 60, RB: 124, K: 30, SD: 64 },
  HAZİRAN: { OD: 64, izin: 0, RB: 124, K: 30, SD: 34 },
  TEMMUZ: { OD: 34, izin: 31, RB: 155, K: 30, SD: 35 },
}

const sod = (d) => new Date(d + 'T00:00:00').getTime()
const eod = (d) => new Date(d + 'T23:59:59').getTime()

const shDonemChain = periods.map(([, bas, bit]) => ({ baslangic_tarihi: bas, bitis_tarihi: bit }))
const allWindows = buildShakWindowsForYear(shDonemChain, 2026, eod('2026-07-14'))
const chain = computeIzyRhKsdShakMonthChain(leaves, allWindows)
const monthKsds = chain.get(sicil) ?? []

function rhDaysInPeriod(bas, bit) {
  const b = sod(bas)
  const e = eod(bit)
  let days = 0
  for (const iv of leaves) {
    const a = sod(iv.ayrilis)
    if (a >= b && a <= e) days += izyRhToplamGun(iv)
  }
  return days
}

console.log('=== Ali Kazancı (180) — aylık zincir ===\n')
let ok = 0
let fail = 0

for (let i = 0; i < periods.length; i++) {
  const [name, bas, bit] = periods[i]
  const exp = expected[name]
  const windows = buildShakWindowsForYear(shDonemChain, 2026, eod(bit))
  const ksd = computeIzyRhKsdForShakMonths(leaves, windows)
  const p = ksd.get(sicil)
  const izin = rhDaysInPeriod(bas, bit)
  const rb = izyRhPeakForSicilYear(leaves, sicil, '2026', eod(bit))
  const monthKsd = monthKsds[i]

  const got = {
    OD: p?.OD ?? 0,
    izin,
    RB: rb,
    K: p?.K ?? 0,
    SD: p?.SD ?? 0,
  }

  const match =
    got.OD === exp.OD &&
    got.izin === exp.izin &&
    got.RB === exp.RB &&
    got.K === exp.K &&
    got.SD === exp.SD

  if (match) ok++
  else fail++

  console.log(
    `${match ? '✓' : '✗'} ${name.padEnd(8)}`,
    `OD=${String(got.OD).padStart(2)} (bekl ${exp.OD})`,
    `İzin=${String(got.izin).padStart(2)} (${exp.izin})`,
    `RB=${String(got.RB).padStart(3)} (${exp.RB})`,
    `K=${String(got.K).padStart(2)} (${exp.K})`,
    `SD=${String(got.SD).padStart(2)} (${exp.SD})`,
  )
  if (monthKsd && (monthKsd.K !== got.K || monthKsd.SD !== got.SD)) {
    console.log('   zincir adımı:', monthKsd)
  }
}

console.log(`\nSonuç: ${ok} uyumlu, ${fail} farklı`)
process.exit(fail > 0 ? 1 : 0)
