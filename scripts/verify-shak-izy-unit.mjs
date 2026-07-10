/**
 * Sosyal Hak IZY — birim / regresyon testleri (DB gerektirmez)
 */
import {
  appendShakIzyCarryOnlySatirlar,
  SHAK_IZY_DEVIR_SIRA_PREFIX,
  shakChainDonemIdsUpTo,
} from '../src/lib/kesinym-hesap.ts'
import {
  buildIzyAnnualRhIzinler,
  buildShakCurrentDonemRhDays,
  isShakIzyDevirSatir,
  mergeRhSiciller,
  shakChainExtraIzySiraNolari,
} from '../src/lib/sosyal-hak-izy-hesap.ts'

let fail = 0
function assert(cond, msg) {
  if (!cond) {
    console.error('✗', msg)
    fail++
  } else {
    console.log('✓', msg)
  }
}

const periods = [
  { id: 1, baslangic_tarihi: '2025-12-15', bitis_tarihi: '2026-01-14' },
  { id: 2, baslangic_tarihi: '2026-04-15', bitis_tarihi: '2026-05-14' },
  { id: 3, baslangic_tarihi: '2026-05-15', bitis_tarihi: '2026-06-14' },
]

assert(
  shakChainDonemIdsUpTo(periods, 2026, '2026-06-14').length === 3,
  'shakChainDonemIdsUpTo — Haziran dahil 3 dönem',
)

assert(
  shakChainExtraIzySiraNolari(['903'], ['903', '649']).join(',') === '649',
  'shakChainExtraIzySiraNolari — yalnızca önceki seçimler',
)

assert(
  mergeRhSiciller(['180'], ['180', '200']).length === 2,
  'mergeRhSiciller — tekrarsız birleşim',
)

const izinler = [
  { sira_no: '903', sicil_no: '180', ad_soyad: 'Ali', unvan: '', tur: 'Heyet Raporu', ayrilis: '2026-05-06', baslama: '2026-07-05', gun: 60 },
]
const days = buildShakCurrentDonemRhDays(izinler, new Set())
assert(days.size === 0, 'buildShakCurrentDonemRhDays — boş seçimde 0 gün')

const days2 = buildShakCurrentDonemRhDays(izinler, new Set(['903']))
assert(days2.get('180') === 60, 'buildShakCurrentDonemRhDays — seçili izin 60 gün')

const annual = buildIzyAnnualRhIzinler(izinler, izinler, { 180: 'Ali' }, {})
assert(annual.length === 1, 'buildIzyAnnualRhIzinler — tek kayıt')

const ksdMap = new Map([['180', { OD: 64, K: 30, SD: 34 }]])
const carrySatirlar = appendShakIzyCarryOnlySatirlar([], ksdMap, annual, Date.parse('2026-06-14T23:59:59'))
assert(carrySatirlar.length === 1, 'appendShakIzyCarryOnlySatirlar — devir satırı üretir')
assert(carrySatirlar[0].SD === 34, 'appendShakIzyCarryOnlySatirlar — SD=34')
assert(isShakIzyDevirSatir(carrySatirlar[0].sira_no), 'isShakIzyDevirSatir — prefix tanır')
assert(carrySatirlar[0].sira_no === `${SHAK_IZY_DEVIR_SIRA_PREFIX}180`, 'devir sira_no biçimi')

const withRh = [{ ...carrySatirlar[0], sira_no: '903', tur: 'Heyet Raporu', HR: 60 }]
const noDup = appendShakIzyCarryOnlySatirlar(withRh, ksdMap, annual)
assert(noDup.length === 1, 'appendShakIzyCarryOnlySatirlar — mevcut R/HR varken devir eklemez')

// Tam zincir doğrulaması: scripts/verify-ali-180.mjs

console.log(fail === 0 ? '\nTüm birim testleri geçti.' : `\n${fail} test başarısız.`)
process.exit(fail > 0 ? 1 : 0)
