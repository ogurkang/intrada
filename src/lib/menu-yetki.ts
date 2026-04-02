/**
 * Sol menü grupları ile `app_profiles.menu_izinleri` JSON anahtarları.
 * Kullanıcı rolü: yalnızca `true` olan anahtarlar erişim verir (varsayılan kapalı).
 * Yönetici rolü: menü JSON’u kullanılmaz (tam erişim).
 *
 * Kullanıcı için alt yol kuralları: docs/YETKILENDIRME_SINIRLARI.md
 */

export type MenuModulKey =
  | 'personel'
  | 'rapor'
  | 'terfi'
  | 'izin'
  | 'bildirim'
  | 'kesintiler'
  | 'egitim'
  | 'yetkilendirme'
  | 'tanimlar'
  | 'link'

export const MENU_MODUL_TANIMLARI: {
  key: MenuModulKey
  /** Tablo başlığı — kısa */
  labelKisa: string
  label: string
  pathPrefixes: string[]
  terfiOzel?: true
}[] = [
  { key: 'personel', labelKisa: 'Personel', label: 'Personel', pathPrefixes: ['/personel', '/firma-calisanlar', '/kadro', '/personel-hareketleri'] },
  { key: 'rapor', labelKisa: 'Rapor', label: 'Rapor Yönetimi', pathPrefixes: ['/rapor'] },
  { key: 'terfi', labelKisa: 'Terfi', label: 'Terfi', pathPrefixes: [], terfiOzel: true },
  { key: 'izin', labelKisa: 'İzin', label: 'İzin Yönetimi', pathPrefixes: ['/izin'] },
  { key: 'bildirim', labelKisa: 'Bildirim', label: 'Bildirim', pathPrefixes: ['/bildirim'] },
  { key: 'kesintiler', labelKisa: 'Kesinti', label: 'Kesintiler', pathPrefixes: ['/kesintiler'] },
  { key: 'egitim', labelKisa: 'Eğitim', label: 'Eğitim', pathPrefixes: ['/egitim'] },
  { key: 'yetkilendirme', labelKisa: 'Yetki', label: 'Yetkilendirme', pathPrefixes: ['/yetkilendirme'] },
  { key: 'tanimlar', labelKisa: 'Tanım', label: 'Tanımlar', pathPrefixes: ['/tanimlar'] },
  { key: 'link', labelKisa: 'Link', label: 'Paylaşım linkleri', pathPrefixes: ['/link'] },
]

/** Yetkilendirme ekranı tablosunda gösterilen sütunlar (link yok) */
export const MENU_YETKILENDIRME_MODULLERI = MENU_MODUL_TANIMLARI.filter(m => m.key !== 'link')

/** Yetkilendirme tablosu: Terfi personel yönetiminde; bu ekranda sütun yok (kayıtta `terfi` korunur). */
export const MENU_YETKILENDIRME_TABLO_MODULLERI = MENU_YETKILENDIRME_MODULLERI.filter(m => m.key !== 'terfi')

export const MENU_FORM_MODULLERI = MENU_MODUL_TANIMLARI

/** Sadece açıkça `true` ise erişim */
export function menuModulAcik(
  key: MenuModulKey,
  menuIzinleri: Record<string, boolean | undefined>,
): boolean {
  return menuIzinleri[key] === true
}

function pathModulEsles(pathname: string, terfiMenuHref: string): MenuModulKey | null {
  if (pathname === '/' || pathname === '') return null
  for (const m of MENU_MODUL_TANIMLARI) {
    if (m.terfiOzel) {
      const t = terfiMenuHref || '/terfi'
      if (pathname === t || pathname.startsWith(t + '/')) return 'terfi'
      continue
    }
    for (const p of m.pathPrefixes) {
      if (pathname === p || pathname.startsWith(p + '/')) return m.key
    }
  }
  return null
}

/**
 * Yönetici (PermissionGate’de ayrı) hariç — **kullanıcı** rolü için URL erişimi.
 * Modül kutusu kapalıysa ilgili yollar zaten kapalıdır.
 */
export function kullaniciPathAllowed(
  pathname: string,
  sicilNo: string,
  menuIzinleri: Record<string, boolean | undefined> = {},
  terfiMenuHref: string = '/terfi',
): boolean {
  const path = (pathname.split('?')[0] || pathname).replace(/\/$/, '') || '/'
  if (path === '/' || path === '') return true

  // İlk kurulum: modül seçimi olmadan da tamamlanabilmeli (PermissionGate ile çakışmasın)
  if (path === '/hesap/ilk-kurulum' || path.startsWith('/hesap/ilk-kurulum/')) return true

  // Giriş yapmış herkes (kullanıcı / yönetici) kendi şifresini güncelleyebilir
  if (path === '/hesap/sifre' || path.startsWith('/hesap/sifre/')) return true

  const sn = sicilNo.trim()
  const t = (terfiMenuHref || '/terfi').trim()

  // —— Personel: kendi kartı her kullanıcıda açık (modül kutusu kapalı olsa da)
  if (path === `/personel/${sn}`) {
    return true
  }
  const mUuid = /^\/personel\/([^/]+)(?:\/(.*))?$/.exec(path)
  if (mUuid?.[1] && /^[0-9a-f-]{36}$/i.test(mUuid[1])) {
    if (mUuid[2]?.includes('duzenle')) return false
    return menuModulAcik('personel', menuIzinleri)
  }
  if (
    path.startsWith('/personel') ||
    path.startsWith('/firma-calisanlar') ||
    path.startsWith('/kadro') ||
    path.startsWith('/personel-hareketleri')
  ) {
    return false
  }
  /** Kullanıcı rolü: Terfi, eğitim ve yetkilendirme ekranları kapalı (yönetici işlemleri). */
  if (path === t || path.startsWith(`${t}/`)) {
    return false
  }
  if (path.startsWith('/egitim')) {
    return false
  }
  if (path.startsWith('/yetkilendirme')) {
    return false
  }

  // İzin: tamamen kapalı
  if (path.startsWith('/izin')) return false

  // Bildirim: aile + mal (alt yollar); genel bakış ve öğrenim kapalı
  if (path.startsWith('/bildirim')) {
    if (!menuModulAcik('bildirim', menuIzinleri)) return false
    if (path === '/bildirim' || path.startsWith('/bildirim/ogrenim')) return false
    if (path.startsWith('/bildirim/aile') || path.startsWith('/bildirim/mal')) return true
    return false
  }

  // Kesintiler: yalnızca yevmiye + arazi
  if (path.startsWith('/kesintiler')) {
    if (!menuModulAcik('kesintiler', menuIzinleri)) return false
    if (path.startsWith('/kesintiler/yevmiye') || path.startsWith('/kesintiler/arazi')) return true
    return false
  }

  /** Kullanıcı rolü: tanımlar ekranları kapalı */
  if (path.startsWith('/tanimlar')) {
    return false
  }

  if (path.startsWith('/link')) return false

  return false
}

export function sidebarGrupGoster(
  grupEtiket: string,
  accessMode: 'full' | 'admin' | 'kullanici',
  menuIzinleri: Record<string, boolean | undefined>,
): boolean {
  if (accessMode === 'full' || accessMode === 'admin') return true
  /** Kullanıcıda «Personel Kartım» her zaman menüde (tek link veya tam grup). */
  if (accessMode === 'kullanici' && grupEtiket === 'Personel Yönetimi') return true
  /** Kullanıcı: eğitim / yetkilendirme / tanımlar sol menüde yok */
  if (
    accessMode === 'kullanici' &&
    (grupEtiket === 'Eğitim Yönetimi' ||
      grupEtiket === 'Yetkilendirme Yönetimi' ||
      grupEtiket === 'Tanımlar Yönetimi')
  ) {
    return false
  }

  const map: Record<string, MenuModulKey> = {
    'Personel Yönetimi': 'personel',
    'Rapor Yönetimi': 'rapor',
    'İzin Yönetimi': 'izin',
    'Bildirim Yönetimi': 'bildirim',
    'Kesintiler Yönetimi': 'kesintiler',
    'Eğitim Yönetimi': 'egitim',
    'Yetkilendirme Yönetimi': 'yetkilendirme',
    'Tanımlar Yönetimi': 'tanimlar',
  }
  const key = map[grupEtiket]
  if (!key) return true
  return menuModulAcik(key, menuIzinleri)
}

export function sidebarTerfiGoster(
  accessMode: 'full' | 'admin' | 'kullanici',
  menuIzinleri: Record<string, boolean | undefined>,
): boolean {
  if (accessMode === 'full' || accessMode === 'admin') return true
  /** Kullanıcı rolü: Terfi menüde gösterilmez */
  if (accessMode === 'kullanici') return false
  return menuModulAcik('terfi', menuIzinleri)
}
