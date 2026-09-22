import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

function oku(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

function hata(mesaj) {
  console.error(`ANA_VERI_KURALI: ${mesaj}`)
  process.exitCode = 1
}

const databaseTypes = oku('src/types/database.ts')
const terfiBas = databaseTypes.indexOf('terfi_hareketleri: {')
const terfiBit = databaseTypes.indexOf('// ─────────────────── İZİN', terfiBas)
if (terfiBas < 0 || terfiBit < 0) {
  hata('terfi_hareketleri tip bölümü bulunamadı.')
} else {
  const terfiTipi = databaseTypes.slice(terfiBas, terfiBit)
  for (const alan of ['ad_soyad', 'unvan', 'mudurluk']) {
    if (new RegExp(`\\b${alan}\\b`).test(terfiTipi)) {
      hata(`terfi_hareketleri içinde “${alan}” kopyası tutulamaz; ana kaynaktan okunmalıdır.`)
    }
  }
}

const terfiActions = oku('src/app/(dashboard)/terfi/actions.ts')
if (/\bad_soyad\s*:/.test(terfiActions) || /\b(unvan|mudurluk)\s*:/.test(terfiActions)) {
  hata('Terfi yazma işlemi personel/kadro ana verisini kopyalıyor.')
}

const hareketActions = oku('src/app/(dashboard)/personel-hareketleri/actions.ts')
if (/ad_soyad\s*:\s*calisan\??\.ad_soyad/.test(hareketActions)) {
  hata('Personel hareketi terfi kaydına ad-soyad kopyalıyor.')
}

const terfiClient = oku('src/components/personel/TerfiClient.tsx')
if (/name=["']ad_soyad["']/.test(terfiClient) || /fd\.set\(["']ad_soyad["']/.test(terfiClient)) {
  hata('Terfi arayüzü ad-soyadı ayrı bir veri olarak gönderiyor.')
}

if (!process.exitCode) {
  console.log('Ana veri kaynak kuralları doğrulandı.')
}
