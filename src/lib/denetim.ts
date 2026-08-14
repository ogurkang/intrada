export const DENETIM_BELGE_BUCKET = 'denetim-belgeler'
export const DENETIM_BELGE_MAX_BOYUT = 15 * 1024 * 1024

export const DENETIM_BELGE_MIME = [
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

export const DENETIM_AYLAR_TR = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
] as const

export type DenetimKararTuru = 'encumen' | 'meclis'

export type DenetimMenuIkonAnahtar =
  | 'karar'
  | 'encumen'
  | 'meclis'
  | 'mali'
  | 'gelir'
  | 'hesap'
  | 'butce'
  | 'tasinmaz'
  | 'performans'
  | 'stratejik'
  | 'program'
  | 'rapor'
  | 'ickontrol'
  | 'yonetmelik'
  | 'ikep'

export type DenetimMenuChild = {
  href: string
  label: string
  aciklama?: string
  ikon?: DenetimMenuIkonAnahtar
}

export type DenetimMenuBolum = {
  href: string
  label: string
  aciklama: string
  ikon?: DenetimMenuIkonAnahtar
  children?: DenetimMenuChild[]
}

/** URL'den dönem id — sol menü bağlamı için */
export function denetimDonemIdFromPath(pathname: string): number | null {
  const m = pathname.match(/^\/denetim\/donemler\/(\d+)(?:\/|$)/)
  if (!m) return null
  const id = Number.parseInt(m[1], 10)
  return Number.isFinite(id) && id > 0 ? id : null
}

/** Dönem içi standart menü ağacı */
export function denetimDonemBolumler(donemId: number): DenetimMenuBolum[] {
  const base = `/denetim/donemler/${donemId}`
  return [
    {
      href: `${base}/karar-bilgileri`,
      label: 'Karar Bilgileri',
      aciklama: 'Encümen ve meclis kararları; aylık belge yükleme.',
      ikon: 'karar',
      children: [
        {
          href: `${base}/karar-bilgileri/encumen-kararlari`,
          label: 'Encümen Kararları',
          aciklama: 'Aylık encümen karar belgeleri.',
          ikon: 'encumen',
        },
        {
          href: `${base}/karar-bilgileri/meclis-kararlari`,
          label: 'Meclis Kararları',
          aciklama: 'Aylık meclis karar belgeleri.',
          ikon: 'meclis',
        },
      ],
    },
    {
      href: `${base}/mali-bilgiler`,
      label: 'Mali Bilgiler',
      aciklama: 'Gelir tarifesi, kesin hesap ve bütçe.',
      ikon: 'mali',
      children: [
        { href: `${base}/mali-bilgiler/gelir-tarifesi`, label: 'Gelir Tarifesi', ikon: 'gelir' },
        { href: `${base}/mali-bilgiler/kesin-hesap`, label: 'Kesin Hesap', ikon: 'hesap' },
        { href: `${base}/mali-bilgiler/butce`, label: 'Bütçe', ikon: 'butce' },
      ],
    },
    {
      href: `${base}/tasinmaz-bilgileri`,
      label: 'Taşınmaz Bilgileri',
      aciklama: 'Belediye taşınmazlarına ilişkin denetim bilgileri.',
      ikon: 'tasinmaz',
    },
    {
      href: `${base}/performans-bilgileri`,
      label: 'Performans Bilgileri',
      aciklama: 'Stratejik plan, performans programı ve faaliyet raporu.',
      ikon: 'performans',
      children: [
        { href: `${base}/performans-bilgileri/stratejik-plan`, label: 'Stratejik Plan', ikon: 'stratejik' },
        { href: `${base}/performans-bilgileri/performans-programi`, label: 'Performans Programı', ikon: 'program' },
        { href: `${base}/performans-bilgileri/faaliyet-raporu`, label: 'Faaliyet Raporu', ikon: 'rapor' },
      ],
    },
    {
      href: `${base}/ic-kontrol-bilgileri`,
      label: 'İç Kontrol Bilgileri',
      aciklama: 'Yönetmelikler ve İKEP.',
      ikon: 'ickontrol',
      children: [
        { href: `${base}/ic-kontrol-bilgileri/yonetmelikler`, label: 'Yönetmelikler', ikon: 'yonetmelik' },
        { href: `${base}/ic-kontrol-bilgileri/ikep`, label: 'İKEP', ikon: 'ikep' },
      ],
    },
  ]
}

/** @deprecated Sol menüde artık dönem listesi kullanılır; geriye dönük referans için. */
export const DENETIM_BOLUMLER: DenetimMenuBolum[] = [
  {
    href: '/denetim/donemler',
    label: 'Denetim Dönemleri',
    aciklama: 'Denetim dönemlerini yönetin.',
  },
]

export function denetimBelgeUzanti(dosyaAdi: string): string {
  const p = dosyaAdi.split('.')
  return p.length > 1 ? (p.pop() ?? '').toLowerCase() : ''
}

export function denetimBelgeMimeCoz(dosyaAdi: string, mime: string | null | undefined): string | null {
  const given = String(mime ?? '').trim().toLowerCase()
  if (DENETIM_BELGE_MIME.includes(given as (typeof DENETIM_BELGE_MIME)[number])) return given
  const ext = denetimBelgeUzanti(dosyaAdi)
  return EXT_MIME[ext] ?? null
}

export function denetimBelgeTurEtiket(dosyaAdi: string, mime: string | null | undefined): string {
  const m = denetimBelgeMimeCoz(dosyaAdi, mime) ?? ''
  if (m.includes('pdf')) return 'PDF'
  if (m.includes('word') || m.endsWith('.document') || m === 'application/msword') return 'Word'
  if (m.includes('excel') || m.includes('spreadsheet')) return 'Excel'
  const ext = denetimBelgeUzanti(dosyaAdi).toUpperCase()
  return ext || 'Dosya'
}

export function denetimBoyutEtiket(byte: number | null | undefined): string {
  if (!byte || byte <= 0) return '—'
  if (byte < 1024) return `${byte} B`
  if (byte < 1024 * 1024) return `${(byte / 1024).toFixed(1)} KB`
  return `${(byte / (1024 * 1024)).toFixed(1)} MB`
}

export function denetimTarihGoster(t: string | null | undefined): string {
  if (!t) return '—'
  return new Date(t).toLocaleDateString('tr-TR')
}
