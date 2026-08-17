export const DIS_DENETCI_SIFRE_MIN = 8
export const DIS_DENETCI_SIFRE_MAX = 64

export function disDenetciSifreGecerliMi(value: string): boolean {
  return value.length >= DIS_DENETCI_SIFRE_MIN && value.length <= DIS_DENETCI_SIFRE_MAX && !/\s/.test(value)
}

export function disDenetciSifreHataMetni(): string {
  return `Şifre ${DIS_DENETCI_SIFRE_MIN}–${DIS_DENETCI_SIFRE_MAX} karakter olmalı ve boşluk içermemelidir.`
}
