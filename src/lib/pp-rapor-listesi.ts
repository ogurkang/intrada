/** Performans Programı → Raporlar altındaki tablo listesi (sıra sabit). */
export type PpRaporKayit = {
  slug: string
  baslik: string
  aciklama: string
  hazir: boolean
}

export const PP_RAPORLAR: PpRaporKayit[] = [
  {
    slug: 'idare-performans-bilgisi',
    baslik: 'İdare Performans Bilgisi Tablosu',
    aciklama: 'Hedef eklerken seçilen müdürlüğe özel; aynı hedef çok müdürlükteyse ayrı tablolar.',
    hazir: true,
  },
  {
    slug: 'faaliyetler-duzeyinde-idare-pp-maliyeti',
    baslik: 'Faaliyetler Düzeyinde İdare Performans Programı Maliyeti Tablosu',
    aciklama: 'Faaliyet bazında idare performans programı maliyetleri.',
    hazir: false,
  },
  {
    slug: 'ekonomik-siniflandirma-duzeyinde-pp-maliyeti',
    baslik: 'Ekonomik Sınıflandırma Düzeyinde Performans Programı Maliyeti Tablosu',
    aciklama: 'Ekonomik sınıflandırma düzeyinde performans programı maliyetleri.',
    hazir: false,
  },
  {
    slug: 'faaliyetlerden-sorumlu-harcama-birimleri',
    baslik: 'Faaliyetlerden Sorumlu Harcama Birimleri Tablosu',
    aciklama: 'Faaliyetlere bağlı harcama birimleri.',
    hazir: false,
  },
  {
    slug: 'performans-gostergeleri-izleme-birimleri',
    baslik: 'Performans Göstergelerinin İzlenmesi ve Takibinden Sorumlu Birimler Tablosu',
    aciklama: 'Gösterge izleme ve takip sorumlusu birimler.',
    hazir: false,
  },
  {
    slug: 'mudurluklerin-performans-programi',
    baslik: 'Müdürlüklerin Performans Programı Tablosu',
    aciklama: 'Yıl ve müdürlük seçilerek tablo ve Excel alınır.',
    hazir: true,
  },
  {
    slug: 'mudurluklerin-faaliyet-maliyetleri',
    baslik: 'Müdürlüklerin Faaliyet Maliyetleri Tablosu',
    aciklama: 'Müdürlük bazında faaliyet maliyetleri.',
    hazir: false,
  },
  {
    slug: 'harcama-birim-yetkilileri',
    baslik: 'Harcama Birim Yetkilileri Tablosu',
    aciklama: 'Harcama birimi yetkilileri listesi.',
    hazir: false,
  },
  {
    slug: 'program-alt-program-stratejik-plan',
    baslik: 'Program-Alt Program Stratejik Plan Tablosu',
    aciklama: 'Program ve alt programın stratejik plan ilişkisi.',
    hazir: false,
  },
  {
    slug: 'mudurluklerin-program-alt-program-stratejik-plan',
    baslik: 'Müdürlüklerin Program-Alt Program Stratejik Plan Tablosu',
    aciklama: 'Müdürlük bazında program–alt program stratejik plan ilişkisi.',
    hazir: false,
  },
]

export function ppRaporBul(slug: string): PpRaporKayit | undefined {
  return PP_RAPORLAR.find(r => r.slug === slug)
}

export const PP_RAPORLAR_BASE = '/stratejik-yonetim/performans-programi/raporlar'
