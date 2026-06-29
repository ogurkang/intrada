/** Pasaport işlemleri audit geçmişi — alan etiketleri ve değer gösterimi. */

const ALANLAR: { alan: string; etiket: string }[] = [
  { alan: 'derece', etiket: 'Kadro Derecesi' },
  { alan: 'unvan', etiket: 'Ünvan' },
  { alan: 'mudurluk', etiket: 'Müdürlük' },
  { alan: 'statu', etiket: 'Statü' },
]

export function pasaportAuditDiffSatirlari(
  onceki: unknown,
  sonraki: unknown,
): { alan: string; etiket: string; onceki: unknown; sonraki: unknown }[] {
  const o = (onceki ?? {}) as Record<string, unknown>
  const s = (sonraki ?? {}) as Record<string, unknown>
  const rows: { alan: string; etiket: string; onceki: unknown; sonraki: unknown }[] = []

  for (const { alan, etiket } of ALANLAR) {
    const ov = o[alan]
    const sv = s[alan]
    if (onceki == null) {
      // Ekleme: dolu yeni değerleri göster.
      if (sv != null && String(sv) !== '') {
        rows.push({ alan, etiket, onceki: null, sonraki: sv })
      }
      continue
    }
    if (String(ov ?? '') !== String(sv ?? '')) {
      rows.push({ alan, etiket, onceki: ov ?? null, sonraki: sv ?? null })
    }
  }
  return rows
}

export function pasaportAuditDegerGoster(alan: string, deger: unknown): string {
  const v = deger == null ? '' : String(deger).trim()
  if (!v) return '—'
  if (alan === 'derece') return `${v}. derece`
  return v
}
