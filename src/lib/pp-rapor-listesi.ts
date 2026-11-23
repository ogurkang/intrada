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
    aciklama: 'Yıl ve müdürlük seçilir; her performans hedefi ayrı tabloda listelenir.',
    hazir: true,
  },
  {
    slug: 'faaliyetler-duzeyinde-idare-pp-maliyeti',
    baslik: 'Faaliyetler Düzeyinde İdare Performans Programı Maliyeti Tablosu',
    aciklama: 'Program → alt program → faaliyet; yıl / yıl+1 / yıl+2 BÜTÇE İÇİ toplamları. Varsayılan yıl CY+1.',
    hazir: true,
  },
  {
    slug: 'ekonomik-siniflandirma-duzeyinde-pp-maliyeti',
    baslik: 'Ekonomik Sınıflandırma Düzeyinde Performans Programı Maliyeti Tablosu',
    aciklama: 'Hizmet / yönetim-destek / genel; yıl / yıl+1 / yıl+2. Varsayılan yıl CY+1.',
    hazir: true,
  },
  {
    slug: 'faaliyetlerden-sorumlu-harcama-birimleri',
    baslik: 'Faaliyetlerden Sorumlu Harcama Birimleri Tablosu',
    aciklama: 'Program başına tablo; faaliyet kodu-adı ve seçilen müdürlük (sorumlu birim).',
    hazir: true,
  },
  {
    slug: 'performans-gostergeleri-izleme-birimleri',
    baslik: 'Performans Göstergelerinin İzlenmesi ve Takibinden Sorumlu Birimler Tablosu',
    aciklama: 'Program / alt program / gösterge ve ilgili müdürlük; tek tabloda alt alta.',
    hazir: true,
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
    aciklama: 'Müdürlük adı ve toplam performans bütçesi; sıralı liste ve Excel.',
    hazir: true,
  },
  {
    slug: 'harcama-birim-yetkilileri',
    baslik: 'Harcama Birim Yetkilileri Tablosu',
    aciklama: 'Müdür unvanlı harcama yetkilileri; Kaydet / Güncelle ile sabitlenir.',
    hazir: true,
  },
  {
    slug: 'program-alt-program-stratejik-plan',
    baslik: 'Program-Alt Program Stratejik Plan Tablosu',
    aciklama: 'Program, alt program, performans hedefi ve stratejik amaç.',
    hazir: true,
  },
  {
    slug: 'mudurluklerin-program-alt-program-stratejik-plan',
    baslik: 'Müdürlüklerin Program-Alt Program Stratejik Plan Tablosu',
    aciklama: 'Kod, program, faaliyet, stratejik amaç/hedef ve ilgili müdürlük.',
    hazir: true,
  },
]

export function ppRaporBul(slug: string): PpRaporKayit | undefined {
  return PP_RAPORLAR.find(r => r.slug === slug)
}

export const PP_RAPORLAR_BASE = '/stratejik-yonetim/performans-programi/raporlar'
