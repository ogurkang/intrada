import { isAdminLike, type AppAccess } from '@/lib/app-access'

export const HAYALET_COOKIE = 'intrada_hayalet_sicil'

export type HayaletProfilDurum = {
  aktif: true
  hedefSicil: string
  hedefAdSoyad: string
}

/** Yönetici veya `menu_izinleri.hayaletProfil` ile hayalet modu başlatabilir. */
export function hayaletProfilYetkisiVar(access: AppAccess): boolean {
  if (isAdminLike(access)) return true
  if (access.mode === 'kullanici') return access.menuIzinleri.hayaletProfil === true
  return false
}

/** Hayalet modda yalnızca performans test yolları (+ seçim ekranı) açık. */
export function hayaletPathAllowed(pathname: string): boolean {
  const path = (pathname.split('?')[0] || pathname).replace(/\/$/, '') || '/'
  if (path === '/yetkilendirme/hayalet-profil') return true
  if (path === '/performans' || path.startsWith('/performans/')) {
    if (path.startsWith('/performans/tanimlar')) return false
    if (path.startsWith('/performans/donem')) return false
    return true
  }
  if (path === '/hesap/sifre' || path.startsWith('/hesap/sifre/')) return true
  return false
}
