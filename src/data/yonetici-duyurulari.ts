export type YoneticiDuyuru = {
  id: string
  baslik: string
  maddeler: string[]
}

/** Yeni bir geliştirme canlıya alınırken buraya yeni bir kayıt eklenir. Yönetici her kaydı bir kez görür. */
export const yoneticiDuyurulari: YoneticiDuyuru[] = [
  {
    id: '2026-10-09-anket-yonetimi',
    baslik: '9 Ekim 2026 — Anket Yönetimi',
    maddeler: [
      'Anketler ve Raporlar menüsü eklendi. Anket adını ve soruları yönetici yazar.',
      'Cevap, paylaşım linki veya giriş ekranındaki anket kodu ile isimsiz alınır. Başlamadan önce küçük grup uyarısı çıkar.',
      'Yayınla düğmesi anketi açar, Yayını kaldır durdurur. Raporda her sorunun grafiği ve sonucu için bir yorum vardır.',
    ],
  },
  {
    id: '2026-10-08-sendika-istifa-tarihi',
    baslik: '8 Ekim 2026 — Sendika istifa ve yeni üyelik',
    maddeler: [
      'İstifa dilekçesinde sendika adı değiştirilemez; yalnızca açık üyelik kapanır ve tarih bugündür.',
      'Üyeliği bitmiş personelde dilekçe açılmaz. Bitiş tarihi popup ile gösterilir.',
      'Yeni sendika kaydı, açık üyeliğin istifa tarihi girilmeden oluşmaz. Bu tarih dilekçe yazmaz. Yeni üyelik o tarihten önce başlayamaz.',
    ],
  },
  {
    id: '2026-10-08-belediye-liste-eposta',
    baslik: '8 Ekim 2026 — Belediye geneli personel listesi',
    maddeler: [
      'Belediye Geneli Personel Listesinde Cep Telefonu sütunundan sonra E-Posta sütunu eklendi. Excel indirmesi de aynı sırayı kullanır.',
    ],
  },
  {
    id: '2026-10-08-sendika-egitim',
    baslik: '8 Ekim 2026 geliştirmeleri',
    maddeler: [
      'Sendika istifa dilekçesi yalnızca açık üyeliği olan personel için oluşturulur. Oluşturmadan önce evrak uyarısı çıkar; Hayır denirse dilekçe yazılmaz.',
      'Yönetici, üyeliği yeniden açacak bir dilekçeyi silerken onay verir. Personelin güncel başka bir üyeliği varsa silme yapılmaz.',
      'İstifa detayında yalnızca tarih düzenlenir. Bu tarih dilekçeyi ve o kaydın kapattığı üyelik bitişini birlikte değiştirir.',
      'Memur personele işçi sendikası, işçi personele memur sendikası üyelik ve düzenleme ekranlarında gösterilmez.',
      'Eğitim takvimi istatistik listesi görev müdürlüğüne göre sıralanır ve süzülür.',
    ],
  },
]
