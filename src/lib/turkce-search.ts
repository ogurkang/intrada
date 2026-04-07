export function trNormalize(input: string | null | undefined): string {
  return (input ?? '')
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
}
