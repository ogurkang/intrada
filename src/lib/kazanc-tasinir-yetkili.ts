import { TASINIR_GOREVI_OPTIONS, tasinirGoreviNormalize } from '@/lib/tasinir-gorevi'
import { auditJsonKayit } from '@/lib/personel-audit'

export const KAZANC_TASINIR_LISTE_HREF = '/tanimlar/kazanc-bilgi?sekme=tasinir'

export function kazancTasinirGoreviGecerliMi(v: string | null | undefined): boolean {
  return tasinirGoreviNormalize(v) != null
}

export function parseKazancPuan(v: string | null | undefined): number | null {
  const t = String(v ?? '').trim().replace(/\s/g, '').replace(',', '.')
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export function formatKazancPuan(n: number): string {
  if (!Number.isFinite(n)) return ''
  if (Number.isInteger(n)) return String(n)
  return String(n)
}

/** Kadro yan ödeme puanı + taşınır puanı. Sayı değilse dolu olanı döner. */
export function kazancPuanTopla(
  kadroYan: string | null | undefined,
  tasinirTutar: string | null | undefined,
): string | null {
  const a = String(kadroYan ?? '').trim()
  const b = String(tasinirTutar ?? '').trim()
  const na = parseKazancPuan(a)
  const nb = parseKazancPuan(b)
  if (na == null && nb == null) return a || b || null
  if (na == null) return b || a || null
  if (nb == null) return a || b || null
  return formatKazancPuan(na + nb)
}

export function tasinirTutarBul(
  gorevAdi: string | null | undefined,
  tutarByGorev: Record<string, string> | null | undefined,
): string | null {
  const gorev = tasinirGoreviNormalize(gorevAdi)
  if (!gorev || !tutarByGorev) return null
  const t = String(tutarByGorev[gorev] ?? '').trim()
  return t || null
}

export function kazancPuanDelta(
  mevcut: string | null | undefined,
  delta: number,
): string | null {
  if (!delta) return String(mevcut ?? '').trim() || null
  const cur = String(mevcut ?? '').trim()
  const n = parseKazancPuan(cur)
  if (n == null) return cur || formatKazancPuan(delta)
  return formatKazancPuan(n + delta)
}

export function yanOdemeTasinirToplamGoster(
  kadroYan: string | null | undefined,
  tasinirGorevi: string | null | undefined,
  tutarByGorev: Record<string, string> | null | undefined,
  _puanTerfide = false,
): { text: string; title?: string } {
  const kadro = String(kadroYan ?? '').trim()
  const ek = tasinirTutarBul(tasinirGorevi, tutarByGorev)
  if (!ek) return { text: kadro || '—' }
  // Terfideki yan_odeme kadro puanıdır; TKY her zaman ekranda eklenir.
  // Bildirimdeki `tasinir_yan_odeme_uygulandi` bayrağına göre atlamak,
  // kaydı hâlâ kadro puanında olan (ör. 264 / 2775) personelde toplamı düşürüyordu.
  void _puanTerfide
  const toplam = kazancPuanTopla(kadro, ek)
  return {
    text: toplam || kadro || ek || '—',
    title: `Kadro ${kadro || '—'} + Taşınır ${ek}`,
  }
}

export function tasinirTanimSirala<T extends { gorev_adi: string }>(rows: T[]): T[] {
  const sira = new Map(TASINIR_GOREVI_OPTIONS.map((g, i) => [g, i]))
  return [...rows].sort((a, b) => {
    const ia = sira.get(a.gorev_adi as (typeof TASINIR_GOREVI_OPTIONS)[number]) ?? 99
    const ib = sira.get(b.gorev_adi as (typeof TASINIR_GOREVI_OPTIONS)[number]) ?? 99
    if (ia !== ib) return ia - ib
    return a.gorev_adi.localeCompare(b.gorev_adi, 'tr')
  })
}

export const TANIM_KAZANC_TASINIR_ALAN_ETIKETLERI: Record<string, string> = {
  gorev_adi: 'Taşınır Görevi',
  tutar: 'Puan',
}

export function tanimKazancTasinirAuditDegerGoster(alan: string, deger: unknown): string {
  if (deger == null || deger === '') return '—'
  return String(deger)
}

export function tanimKazancTasinirAuditDiffSatirlari(onceki: unknown, sonraki: unknown) {
  const o = auditJsonKayit(onceki)
  const s = auditJsonKayit(sonraki)
  const alanlar = new Set([...Object.keys(o), ...Object.keys(s)])
  const out: { alan: string; etiket: string; onceki: unknown; sonraki: unknown }[] = []
  const norm = (v: unknown) => (v == null ? '' : String(v).trim())
  const oBos = !Object.keys(o).some(k => norm(o[k]))
  for (const alan of alanlar) {
    const etiket = TANIM_KAZANC_TASINIR_ALAN_ETIKETLERI[alan] ?? alan
    const eski = o[alan] ?? null
    const yeni = s[alan] ?? null
    if (norm(eski) === norm(yeni)) continue
    out.push({
      alan,
      etiket,
      onceki: oBos && norm(yeni) ? '—' : eski,
      sonraki: yeni,
    })
  }
  return out.sort((a, b) => a.etiket.localeCompare(b.etiket, 'tr'))
}

export function tanimKazancTasinirAuditSnapshot(row: {
  gorev_adi?: string | null
  tutar?: string | null
}): Record<string, unknown> {
  return {
    gorev_adi: row.gorev_adi ?? '',
    tutar: row.tutar ?? '',
  }
}
