export const DENETIM_BELGE_BUCKET = 'denetim-belgeler'
export const DENETIM_BELGE_MAX_BOYUT = 50 * 1024 * 1024

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
export type DenetimBelgeBolumu = 'mali' | 'performans' | 'ic_kontrol' | 'insan_kaynaklari'
export type DenetimBelgeTuru = 'karar' | 'bolum'

export const DENETIM_BOLUM_META: Record<
  DenetimBelgeBolumu,
  { label: string; path: string; aciklama: string }
> = {
  mali: {
    label: 'Mali Bilgiler',
    path: 'mali-bilgiler',
    aciklama: 'Gelir tarifesi, kesin hesap, bütçe ve ek mali belge başlıkları.',
  },
  performans: {
    label: 'Performans Bilgileri',
    path: 'performans-bilgileri',
    aciklama: 'Stratejik plan, performans programı, faaliyet raporu ve ek başlıklar.',
  },
  ic_kontrol: {
    label: 'İç Kontrol Bilgileri',
    path: 'ic-kontrol-bilgileri',
    aciklama: 'İKEP ve ek iç kontrol belge başlıkları.',
  },
  insan_kaynaklari: {
    label: 'İnsan Kaynakları Bilgileri',
    path: 'insan-kaynaklari-bilgileri',
    aciklama: 'Sosyal denge, toplu iş sözleşmesi ve norm kadro belgeleri.',
  },
}

export function denetimBolumMu(value: string): value is DenetimBelgeBolumu {
  return (
    value === 'mali' ||
    value === 'performans' ||
    value === 'ic_kontrol' ||
    value === 'insan_kaynaklari'
  )
}

export type DenetimAltBolum = {
  anahtar: string
  label: string
  aciklama: string
  ikon: DenetimMenuIkonAnahtar
}

/** Bölüm altındaki sabit menüler; başlıklar bunların içine eklenir. */
export const DENETIM_ALT_BOLUMLER: Record<DenetimBelgeBolumu, DenetimAltBolum[]> = {
  mali: [
    { anahtar: 'gelir-tarifesi', label: 'Gelir Tarifesi', aciklama: 'Gelir tarifesi belgeleri.', ikon: 'gelir' },
    { anahtar: 'kesin-hesap', label: 'Kesin Hesap', aciklama: 'Kesin hesap belgeleri.', ikon: 'hesap' },
    { anahtar: 'butce', label: 'Bütçe', aciklama: 'Bütçe belgeleri.', ikon: 'butce' },
  ],
  performans: [
    { anahtar: 'stratejik-plan', label: 'Stratejik Plan', aciklama: 'Stratejik plan belgeleri.', ikon: 'stratejik' },
    { anahtar: 'performans-programi', label: 'Performans Programı', aciklama: 'Performans programı belgeleri.', ikon: 'program' },
    { anahtar: 'faaliyet-raporu', label: 'Faaliyet Raporu', aciklama: 'Faaliyet raporu belgeleri.', ikon: 'rapor' },
  ],
  ic_kontrol: [
    { anahtar: 'ikep', label: 'İKEP', aciklama: 'İç Kontrol Eylem Planı belgeleri.', ikon: 'ikep' },
  ],
  insan_kaynaklari: [
    { anahtar: 'sosyal-denge', label: 'Sosyal Denge', aciklama: 'Sosyal denge sözleşmesi ve ilgili belgeler.', ikon: 'sosyaldenge' },
    { anahtar: 'toplu-is-sozlesmesi', label: 'Toplu İş Sözleşmesi', aciklama: 'Toplu iş sözleşmesi ve ilgili belgeler.', ikon: 'sozlesme' },
    { anahtar: 'norm-kadro', label: 'Norm Kadro', aciklama: 'Norm kadro cetvelleri ve ilgili belgeler.', ikon: 'normkadro' },
  ],
}

export function denetimAltBolumBul(
  bolum: DenetimBelgeBolumu,
  anahtar: string,
): DenetimAltBolum | null {
  if (anahtar === 'yonetmelikler') {
    return { anahtar: 'yonetmelikler', label: 'Yönetmelikler', aciklama: 'Yönetmelik belgeleri.', ikon: 'yonetmelik' }
  }
  return DENETIM_ALT_BOLUMLER[bolum].find(a => a.anahtar === anahtar) ?? null
}

export function denetimAltBolumYolu(
  donemId: number,
  bolum: DenetimBelgeBolumu,
  anahtar: string,
): string {
  return `/denetim/donemler/${donemId}/${DENETIM_BOLUM_META[bolum].path}/${anahtar}`
}

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
  | 'insankaynaklari'
  | 'sosyaldenge'
  | 'sozlesme'
  | 'normkadro'

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
      href: `${base}/yonetmelikler`,
      label: 'Yönetmelikler',
      aciklama: 'Yönetmelik belgeleri.',
      ikon: 'yonetmelik',
    },
    {
      href: `${base}/ic-kontrol-bilgileri`,
      label: 'İç Kontrol Bilgileri',
      aciklama: 'İKEP.',
      ikon: 'ickontrol',
      children: [
        { href: `${base}/ic-kontrol-bilgileri/ikep`, label: 'İKEP', ikon: 'ikep' },
      ],
    },
    {
      href: `${base}/insan-kaynaklari-bilgileri`,
      label: 'İnsan Kaynakları Bilgileri',
      aciklama: 'Sosyal denge, toplu iş sözleşmesi ve norm kadro.',
      ikon: 'insankaynaklari',
      children: [
        { href: `${base}/insan-kaynaklari-bilgileri/sosyal-denge`, label: 'Sosyal Denge', ikon: 'sosyaldenge' },
        { href: `${base}/insan-kaynaklari-bilgileri/toplu-is-sozlesmesi`, label: 'Toplu İş Sözleşmesi', ikon: 'sozlesme' },
        { href: `${base}/insan-kaynaklari-bilgileri/norm-kadro`, label: 'Norm Kadro', ikon: 'normkadro' },
      ],
    },
  ]
}

export type DenetimMenuSayfaTuru = 'hub' | 'belge' | 'karar_ay' | 'tasinmaz'

/** Sabit sistem menülerinin dönem köküne göre göreli yolu */
export const DENETIM_SISTEM_YOL: Record<string, string> = {
  'karar-bilgileri': 'karar-bilgileri',
  'encumen-kararlari': 'karar-bilgileri/encumen-kararlari',
  'meclis-kararlari': 'karar-bilgileri/meclis-kararlari',
  'mali-bilgiler': 'mali-bilgiler',
  'gelir-tarifesi': 'mali-bilgiler/gelir-tarifesi',
  'kesin-hesap': 'mali-bilgiler/kesin-hesap',
  butce: 'mali-bilgiler/butce',
  'tasinmaz-bilgileri': 'tasinmaz-bilgileri',
  'performans-bilgileri': 'performans-bilgileri',
  'stratejik-plan': 'performans-bilgileri/stratejik-plan',
  'performans-programi': 'performans-bilgileri/performans-programi',
  'faaliyet-raporu': 'performans-bilgileri/faaliyet-raporu',
  yonetmelikler: 'yonetmelikler',
  'ic-kontrol-bilgileri': 'ic-kontrol-bilgileri',
  ikep: 'ic-kontrol-bilgileri/ikep',
  'insan-kaynaklari-bilgileri': 'insan-kaynaklari-bilgileri',
  'sosyal-denge': 'insan-kaynaklari-bilgileri/sosyal-denge',
  'toplu-is-sozlesmesi': 'insan-kaynaklari-bilgileri/toplu-is-sozlesmesi',
  'norm-kadro': 'insan-kaynaklari-bilgileri/norm-kadro',
}

export function denetimMenuYolu(
  donemId: number,
  menu: { id: number; sistem_anahtari?: string | null },
): string {
  const anahtar = menu.sistem_anahtari ?? ''
  const rel = DENETIM_SISTEM_YOL[anahtar]
  if (rel) return `/denetim/donemler/${donemId}/${rel}`
  return `/denetim/donemler/${donemId}/m/${menu.id}`
}

export function denetimBolumFromSistem(anahtar: string | null | undefined): DenetimBelgeBolumu | null {
  switch (anahtar) {
    case 'mali-bilgiler':
    case 'gelir-tarifesi':
    case 'kesin-hesap':
    case 'butce':
      return 'mali'
    case 'performans-bilgileri':
    case 'stratejik-plan':
    case 'performans-programi':
    case 'faaliyet-raporu':
      return 'performans'
    case 'ic-kontrol-bilgileri':
    case 'yonetmelikler':
    case 'ikep':
      return 'ic_kontrol'
    case 'insan-kaynaklari-bilgileri':
    case 'sosyal-denge':
    case 'toplu-is-sozlesmesi':
    case 'norm-kadro':
      return 'insan_kaynaklari'
    default:
      return null
  }
}

export function denetimMenuSlugUret(baslik: string): string {
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

/** @deprecated Sol menüde artık dönem listesi kullanılır; geriye dönük referans için. */
export const DENETIM_BOLUMLER: DenetimMenuBolum[] = [
  {
    href: '/denetim',
    label: 'Genel Bakış',
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
