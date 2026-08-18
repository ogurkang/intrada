export const KYS_BELGE_BUCKET = 'kys-belgeler'
export const KYS_BELGE_MAX_BOYUT = 50 * 1024 * 1024
export const KYS_MENU_SILME_ENGEL =
  'Menü İçeriğinde Belge Bulunduğundan Silme İşlemi Gerçekleşmemiştir.'

export const KYS_BELGE_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel.sheet.macroEnabled.12',
] as const

const EXT_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xlsm: 'application/vnd.ms-excel.sheet.macroEnabled.12',
}

export type KysMenuSayfaTuru = 'hub' | 'belge'

export type KysMenuChild = {
  href: string
  label: string
  aciklama?: string
  ikon?: string
}

export function kysMenuYolu(menuId: number): string {
  return `/kys/m/${menuId}`
}

export function kysMenuSlugUret(baslik: string): string {
  const ham = baslik
    .toLocaleLowerCase('tr-TR')
    .replaceAll('ı', 'i')
    .replaceAll('ğ', 'g')
    .replaceAll('ü', 'u')
    .replaceAll('ş', 's')
    .replaceAll('ö', 'o')
    .replaceAll('ç', 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return ham || 'menu'
}

export function kysBelgeUzanti(dosyaAdi: string): string {
  const p = dosyaAdi.split('.')
  return p.length > 1 ? (p.pop() ?? '').toLowerCase() : ''
}

export function kysBelgeMimeCoz(dosyaAdi: string, mime: string | null | undefined): string | null {
  const given = String(mime ?? '').trim().toLowerCase()
  if (KYS_BELGE_MIME.includes(given as (typeof KYS_BELGE_MIME)[number])) return given
  const ext = kysBelgeUzanti(dosyaAdi)
  return EXT_MIME[ext] ?? null
}

export function kysBoyutEtiket(byte: number | null | undefined): string {
  if (!byte || byte <= 0) return '—'
  if (byte < 1024) return `${byte} B`
  if (byte < 1024 * 1024) return `${(byte / 1024).toFixed(1)} KB`
  return `${(byte / (1024 * 1024)).toFixed(1)} MB`
}
