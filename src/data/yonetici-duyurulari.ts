export type YoneticiDuyuru = {
  id: string
  baslik: string
  maddeler: string[]
}

/** Yeni bir geliştirme canlıya alınırken buraya yeni bir kayıt eklenir. Yönetici her kaydı bir kez görür. */
export const yoneticiDuyurulari: YoneticiDuyuru[] = [
  {
    id: '2026-10-10-anket-aciklama-genislik',
    baslik: '10 Ekim 2026 — Anket açıklaması',
    maddeler: [
      'Anketler sayfasındaki açıklama metni, listenin genişliğine yayılır.',
    ],
  },
  {
    id: '2026-10-10-anket-aciklama-sablon',
    baslik: '10 Ekim 2026 — Anket açıklaması ve demografik şablon',
    maddeler: [
      'Anketler başlığının altında, anketin isimsiz nasıl işlediği ve raporun ne söylediği yazıyor.',
      'Anket oluştururken ve düzenlerken demografik sorular tek düğmeyle eklenir. Öğrenim ve statü seçenekleri kayıtlı tanımlardan gelir. İstenmeyen soru işaretlenip çıkarılır.',
    ],
  },
  {
    id: '2026-10-10-anket-kirilim-form',
    baslik: '10 Ekim 2026 — Anket grup yorumu ve soru formu',
    maddeler: [
      'Yaş, cinsiyet, öğrenim veya statü tek seçim sorusu varsa rapor, cevaplayan grupların sonucunu yazar. Örnek: anketi cevaplayan kadınlar, anketi cevaplayan memurların 18-25 yaş olanları.',
      'Bu dağılım kayıtlı aktif personelle yan yana konur. Yakınlık, kurumun genelinin düşüncesi olarak okunmaz.',
      'Anket linkini açan kişi soruları boş PDF olarak indirebilir.',
    ],
  },
  {
    id: '2026-10-09-anket-pasta-silme',
    baslik: '9 Ekim 2026 — Anket silme uyarısı ve pasta grafik',
    maddeler: [
      'Cevabı olan bir soru silinirken veya düzenlenirken, sonucun etkileneceği uyarısı çıkar. Hala sil veya Hala düzenle denirse işlem yapılır.',
      'Tek seçim, çoklu seçim ve evet/hayır sonuçları pasta dilimi olarak gösterilir. Puan çubuk, serbest metin liste olarak kalır.',
    ],
  },
  {
    id: '2026-10-09-anket-soru-yorum',
    baslik: '9 Ekim 2026 — Anket soru kartı ve yorum',
    maddeler: [
      'Cevap ekranında soru metni kartın içinde durur. Puan sorusunda 1 çok kötü, 5 çok iyi anlamına gelir.',
      'Rapor yorumu sorunun metnini ve cevap dağılımını birlikte okur.',
      'Anket detayında sorular işaretlenip toplu silinebilir.',
    ],
  },
  {
    id: '2026-10-09-anket-islemler',
    baslik: '9 Ekim 2026 — Anket işlemleri',
    maddeler: [
      'Anket listesindeki saat, kalem ve göz diğer modüllerdeki işlem ikonlarına çekildi. Log aynı geçmiş tablosunda açılır.',
      'İşlemler sütunundan yayın açılıp kapatılır. İki oklu düğme cevapları sıfırlar; sorular durur.',
      'Rapor çubukları ayrı renktedir. Rapor PDF olarak indirilir.',
    ],
  },
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
