export type IntradaBtnVariant = 'ekle' | 'duzenle' | 'detay' | 'kaydet' | 'ust-menu' | 'excel'

/** Tüm aksiyon düğmeleri: beyaz metin, sağ hizalı toolbar’larda kullanılır. */
export const INTRADA_BTN_BASE =
  'intrada-btn inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap'

export const INTRADA_BTN_VARIANT: Record<IntradaBtnVariant, string> = {
  ekle: 'intrada-btn-ekle',
  duzenle: 'intrada-btn-duzenle', // Düzenle ve Değiştir
  detay: 'intrada-btn-detay',
  kaydet: 'intrada-btn-kaydet',
  'ust-menu': 'intrada-btn-ust-menu',
  excel: 'intrada-btn-excel',
}

export function intradaBtnClass(variant: IntradaBtnVariant, extra?: string): string {
  return [INTRADA_BTN_BASE, INTRADA_BTN_VARIANT[variant], extra].filter(Boolean).join(' ')
}

/** Tablo satırı ikon düğmeleri (8×8) */
export const INTRADA_ICON_BTN_BASE =
  'intrada-icon-btn inline-flex items-center justify-center w-8 h-8 rounded-lg text-white transition-colors disabled:opacity-40 shrink-0'

export function intradaIconBtnClass(variant: Exclude<IntradaBtnVariant, 'excel' | 'ust-menu' | 'kaydet'>, extra?: string): string {
  const map: Record<string, string> = {
    ekle: 'intrada-icon-btn-ekle',
    duzenle: 'intrada-icon-btn-duzenle',
    detay: 'intrada-icon-btn-detay',
  }
  return [INTRADA_ICON_BTN_BASE, map[variant], extra].filter(Boolean).join(' ')
}

/** Form alanları — koyu antrasit metin (dark mode kaynaklı görünmez yazı sorununu önler) */
export const INTRADA_FORM_INPUT =
  'intrada-form-input text-slate-800 placeholder:text-slate-400 bg-white'

export const INTRADA_TOOLBAR_ACTIONS = 'flex flex-wrap items-center gap-2 justify-end shrink-0'
