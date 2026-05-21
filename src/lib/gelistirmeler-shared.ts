export type GelistirmeKaydi = {
  hash: string
  fullHash: string
  date: string
  subject: string
}

export type GelistirmelerData = {
  generatedAt: string
  commits: GelistirmeKaydi[]
}

/** Conventional commit öneki (feat, fix, …) ve kalan metin. */
export function parseCommitSubject(subject: string): { tip: string | null; baslik: string } {
  const m = subject.match(/^(\w+)(?:\([^)]+\))?!?:\s*(.+)$/i)
  if (m) {
    return { tip: m[1].toLowerCase(), baslik: m[2].trim() }
  }
  return { tip: null, baslik: subject }
}

const TIP_ETIKET: Record<string, string> = {
  feat: 'Yeni',
  fix: 'Düzeltme',
  docs: 'Dokümantasyon',
  refactor: 'Refaktör',
  chore: 'Bakım',
  style: 'Stil',
  test: 'Test',
  perf: 'Performans',
}

export function commitTipEtiket(tip: string | null): string | null {
  if (!tip) return null
  return TIP_ETIKET[tip] ?? tip
}
