export type YoneticiDuyuru = {
  id: string
  baslik: string
  maddeler: string[]
}

/** Yeni bir geliştirme canlıya alınırken buraya yeni bir kayıt eklenir. Yönetici her kaydı bir kez görür. */
export const yoneticiDuyurulari: YoneticiDuyuru[] = [
  {
    id: '2026-10-15-evrak-imza-iban',
    baslik: '15 Ekim 2026 — Evrak imzası ve IBAN',
    maddeler: [
      'Aylıktan kesme, emeklilik tazminatı ve ölüm yardımı PDF’lerinde düzenleyen ile gerçekleştirme görevlisi, İnsan Kaynakları ve Eğitim Müdürlüğü personelinden seçilir.',
      'Ölüm yardımı IBAN alanı biçimlenir ve hatalı numarada uyarır.',
    ],
  },
  {
    id: '2026-10-14-terfi-hesaplama-anket',
    baslik: '14 Ekim 2026 — Terfi, hesaplama ve anket',
    maddeler: [
      'Terfi hareketlerinde iyi hal terfi tarihi ayrı sütundadır. Terfi ettir ve geri al sırasında tamamlanma yüzdesi görünür.',
      'Emeklilik tazminatı ve ölüm yardımı, aylıktan kesmedeki gibi oluşturulur, önizlenir, düzenlenir, silinir ve PDF indirilir. Ölüm yardımı 657 m. 208’e göre iki kattır; varis paylarının toplamı yardım tutarına eşittir.',
      'Anket raporlarında düzenle işareti yoktur. Rapor detayında Raporlara dön düğmesi PDF indirin yanındadır.',
    ],
  },
  {
    id: '2026-10-14-anket-kucuk-grup-uyari',
    baslik: '14 Ekim 2026 — Anket başlangıç uyarısı',
    maddeler: [
      'Anket sayfasındaki «az sayıda kişi cevapladığında sonuç grafiği bir kişiyi belli edebilir» uyarısı kaldırıldı. İsimsiz kayıt uyarısı duruyor.',
    ],
  },
  {
    id: '2026-10-14-anket-kisa-ad',
    baslik: '14 Ekim 2026 — Anket kısa adı ve giriş',
    maddeler: [
      'Anketin linki, oluştururken yazılan kısa adla biter. Kısa adda Türkçe karakter ve boşluk olmaz.',
      'Kalem yalnız anket bilgilerini düzenler. Sorular göz işaretindedir. Yayındaki anket silinemez.',
      'Giriş ekranında anket kodu yoktur. Yayındaki anketin adı Ankete Git, yanında Anketi İndir durur.',
    ],
  },
  {
    id: '2026-10-12-yari-zamanli-saat',
    baslik: '12 Ekim 2026 — Yarı zamanlı saat dilimi',
    maddeler: [
      'Yarı zamanlı çalışma tablosunda 12:30 ve 17:30 kutuları kalktı. Bir günün tüm kutuları 8 saattir. 08:30 kutusu 08:30-09:00 arasını sayar.',
    ],
  },
  {
    id: '2026-10-12-sosyal-hak-50-gun',
    baslik: '12 Ekim 2026 — Sosyal hak 50 gün sınırı',
    maddeler: [
      'Sosyal hak dönem detayı açıldığında, o yıl yıllık izni 50 gün ve üzeri olan personelin sicili ve adı popup olarak gösterilir.',
    ],
  },
  {
    id: '2026-10-12-ayy-kacak-gun',
    baslik: '12 Ekim 2026 — Dönemden önce başlayan izin',
    maddeler: [
      'Dönem kapandıktan sonra kaydedilen ve yeni dönemden önce başlayan izin, kapalı dönemin kesilen iznine eklenmez. Dönemden önceki kaçan günler sonraki döneme yazılır ve yeni dönemde kesilir.',
    ],
  },
  {
    id: '2026-10-12-ayy-kesilen-izin-dokumu',
    baslik: '12 Ekim 2026 — Aylık yemek kesilen izin',
    maddeler: [
      'Aylık yemek özetinde Kesilen İzin hücresinin üzerine gelince, o günün hangi izinlerden geldiği açılır.',
    ],
  },
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
