export type YoneticiDuyuru = {
  id: string
  baslik: string
  maddeler: string[]
}

/** Yeni bir geliştirme canlıya alınırken buraya yeni bir kayıt eklenir. Yönetici her kaydı bir kez görür. */
export const yoneticiDuyurulari: YoneticiDuyuru[] = [
  {
    id: '2026-10-23-rapor-sihirbazi-excel',
    baslik: '23 Ekim 2026 — Rapor Sihirbazı',
    maddeler: [
      'İstihdam türü tik ile seçilir. İşaretlenen türlerdeki personelin tamamı rapora girer.',
      'Excel sol üste yaslanır. Başlık rengi yalnızca başlık yazan hücrelerdedir.',
    ],
  },
  {
    id: '2026-10-23-rapor-sihirbazi',
    baslik: '23 Ekim 2026 — Rapor Sihirbazı',
    maddeler: [
      'Rapor Yönetiminde Genel Bakışın altında Rapor Sihirbazı var. İstihdam türü, listelenecek personelin havuzunu belirler. Veri giriş başlıkları tiklenir; Adı Soyadı de bu başlıklar arasındadır. Önizlemede Sıra No ilk sütunda kalır, diğer sütunlar sürüklenerek yer değiştirir. Excel, yazılan dosya adıyla iner. Yatay ve dikey, sayfanın basım yönüdür.',
    ],
  },
  {
    id: '2026-10-23-belediye-geneli-okul-meslek',
    baslik: '23 Ekim 2026 — Belediye geneli personel listesi',
    maddeler: [
      'Belediye Geneli Personel Listesinde Öğrenim sütunundan sonra Okul / Bölüm ve Mesleği gelir. Değerler, Öğrenim Bildirimindeki varsayılan kayıttan okunur. Excel çıktısında da aynı sütunlar vardır.',
    ],
  },
  {
    id: '2026-10-22-ick-izrapor',
    baslik: '22 Ekim 2026 — İzleme raporu',
    maddeler: [
      'İzleme raporunun Word çıktısı kurum şablonundan üretilir. Özet, dönem eylemleri ve değerlendirme tabloları dönemin kayıtlarından dolar. PDF ve Excel aynı kalır.',
      'Raporlar listesinde indirme ve dönem kapatma İşlemler sütunundadır. İndirme düğmesi Word, PDF ve Excel seçeneklerini açar.',
    ],
  },
  {
    id: '2026-10-21-ick-onizleme-hatirlatma',
    baslik: '21 Ekim 2026 — İç kontrol hatırlatma ve bakış',
    maddeler: [
      'Tamamlanma tarihine 10 gün kalan eylem için müdürlük koordinatörüne ve işlemciye SMS kendiliğinden gider. Aynı gün ikinci kez gitmez.',
      'İç kontrol koordinatörü, İç Kontrol ekranında bir personeli seçip onun eylemlerini salt okunur görür. Kayıt değişmez.',
      'Gelen mektup uyarısı, e-posta sayfası kapalıyken de sağ altta çıkar. Sistemde oturum açıkken kontrol edilir.',
    ],
  },
  {
    id: '2026-10-21-eposta-gelen-bildirim',
    baslik: '21 Ekim 2026 — Gelen mektup',
    maddeler: [
      'E-posta İşlemleri açıkken gelen kutuya yeni mektup düşünce uyarı çıkar. Gelen düğmesinde okunmamış sayısı durur. Kutu değiştirilirken liste boşalır ve Yükleniyor yazar.',
    ],
  },
  {
    id: '2026-10-20-dashboard-adabel',
    baslik: '20 Ekim 2026 — Ana sayfa',
    maddeler: [
      'Genel bakıştaki kadro doluluk kartı kalktı. Aynı yerde ayrılmamış ADABEL personel sayısı durur ve ADABEL listesine gider.',
    ],
  },
  {
    id: '2026-10-19-eposta-saat',
    baslik: '19 Ekim 2026 — E-posta saati',
    maddeler: [
      'E-posta listesindeki saat Türkiye saatine göre görünür. Eski mektuplar da ekranda gerçek saate döner; kayıtların içindeki an değişmez.',
    ],
  },
  {
    id: '2026-10-19-eposta-gonderilmis',
    baslik: '19 Ekim 2026 — Gönderilmiş kutusu ve alıcı',
    maddeler: [
      'Gönderilen mektubun kopyası Gönderilmiş klasörüne de yazılır. Daha önce giden mektuplar bu kutuda görünmez; bundan sonraki gönderimler görünür.',
      'Yeni mektup ve iletmede Kime, Bilgi veya Gizli alanına personelin adı yazılırsa mektup sistemdeki e-posta adresine gider. Yazarken eşleşen kişiler listelenir.',
    ],
  },
  {
    id: '2026-10-19-eposta-dosya-sec',
    baslik: '19 Ekim 2026 — E-posta eki',
    maddeler: [
      'E-posta yazarken Dosya seç düğmesinin çerçevesi ve zemini var; ek seçmek daha belirgin.',
    ],
  },
  {
    id: '2026-10-19-eposta-kutusu',
    baslik: '19 Ekim 2026 — E-posta kutusu',
    maddeler: [
      'İletişim Yönetimi › E-posta İşlemleri gelen, gönderilmiş ve spam kutularını açar. Yeni mektup tek kişiye veya virgülle ayrılmış birden çok kişiye gider. Yanıtla ve ilet vardır. Ek, belge yüklemesindeki gibi doğrudan depoya gider; sınır 20 MB ve gönderim kutusunda yazılır.',
      'Görünen ad Adapazarı Belediyesi İnsan Kaynakları ve Eğitim Müdürlüğüdür. Mektubun altında gönderen personelin ad soyadı, müdürlüğü ve görev unvanı durur. Vekil olarak müdür unvanı varsa imzada o unvan yer alır. Tanımlar’daki E-posta imzası bu bilgilerin altında durur. Şifre Tanımlar ekranına yazılır.',
    ],
  },
  {
    id: '2026-10-19-sms-iletimx',
    baslik: '19 Ekim 2026 — SMS gönderim adresi',
    maddeler: [
      'SMS, İletimX adresine gider. Tanımlar ekranında kullanıcı adının yanına bayi kodu girilir; gönderimde ikisi kullaniciadi-bayikodu olarak birleşir.',
      'Türkçe karakter açıksa metin buna göre gider. İletim raporu: iletildi, beklemede, zaman aşımı, iletilmedi.',
    ],
  },
  {
    id: '2026-10-16-ic-kontrol-ara-asama',
    baslik: '16 Ekim 2026 — İç Kontrol rolleri ve raporlar',
    maddeler: [
      'Rol atama ekranı kalktı. Plan açılırken koordinasyon müdürlüğü ve o müdürlüğün personelinden iç kontrol koordinatörleri seçilir. Mevcut planları düzenleyip koordinatörleri seçin.',
      'Müdürlük koordinatörü ve müdürlük işlemcisi her eylemde, sorumlu müdürlük seçilince gelen personel listesinden seçilir. Eyleme yalnızca seçilen kişiler bildirim girer; koordinatöre müdürlük koordinatörü gönderir. Seçim, plandaki aynı müdürlüğün diğer eylemlerine tek seferde uygulanabilir.',
      'Eylem listesinde ilk sütun sıra numarası, son sütun işlemlerdir. Sıra saat, kalem, göz: saat değişiklik geçmişini, kalem eylemi, göz detayı açar. Tamamlanma tarihi sütunu "Termin" yerine bu adla yazılır.',
      'Plan ekranındaki iç kontrol koordinatörleri, personel kaydındaki ad soyadla görünür.',
      'Genel bakışta gerçekleşme halkası ve bileşen ile sorumlu birim çubukları var. Plana git, Eylem Planları ve eylem ekranındaki İKEP dönem ana sayfası düğme oldu.',
      'Kişiler sicil veya kullanıcı adıyla değil, personel kaydındaki ad soyadla görünür. Vekil olarak müdür unvanı olan kişinin unvanı o müdür unvanıdır.',
      'Plan ekranından Word indir, İKEP plan şablonunu sistemdeki eylemlerle doldurur. 2025-2026 planının dosya adı İKEP_2526.docx olur.',
      'İç kontrol koordinatörü her eyleme "Müdürlük adına bildirim gir" ile bildirim girebilir, kanıt yükleyip gönderebilir ve kendisi kesinleştirebilir. Bilginin kaynağı zorunludur; kayıt, rapor ve geçmişte "Müdürlük adına iç kontrol koordinatörü girdi" ibaresi görünür.',
      'Belediye Başkanı ve Başkan Yardımcıları aktif organizasyondan otomatik izleyicidir. Başkan yardımcısı genel bakışta bağlı müdürlüklerini vurgulu görür.',
      'Menü: Genel Bakış, Eylem Planları, Raporlar, Tanımlar. İş Kutum ve İnceleme plan detayında sekmedir.',
      'İzleme sıklığı plan başına yılda 1, 2 veya 4 dönemdir ve dönemler kendiliğinden oluşur. Koordinatör, süresi biten dönemi kapatır. Geciken eylem tamamlanana dek sonraki dönemlerde görünür; sürekli eylem her dönemde görünür ve orana katılmaz.',
      'Yeni plan yürürlüğe girince önceki planın tamamlanmamış eylemleri "Önceki eylem planından" notuyla aktarılır. 2025 dönemleri aktarılan gerçekleşmelerle tamamlandı olarak kapanır.',
    ],
  },
  {
    id: '2026-10-16-ic-kontrol-plan-liste',
    baslik: '16 Ekim 2026 — Eylem planları listesi',
    maddeler: [
      'İç Kontrol Yönetimi › Eylem Planları listesinde sıra numarası var. İşlemler sütununda kalem plan bilgilerini düzenler, saat oluşturma ve düzenleme geçmişini gösterir, göz plan detayını açar.',
    ],
  },
  {
    id: '2026-10-16-anket-tek-tarayici',
    baslik: '16 Ekim 2026 — Anket, aynı tarayıcı',
    maddeler: [
      'Anketler listesinde işlemler sütununa T işareti geldi. Düz T, aynı tarayıcıdan birden fazla cevaba izin verir. Üzeri çarpılı T, aynı tarayıcıdan ikinci cevabı keser.',
      'Mevcut anketler çarpılı T ile durur. İşarete basınca kural değişir.',
    ],
  },
  {
    id: '2026-10-16-ic-kontrol-faz1',
    baslik: '16 Ekim 2026 — İç Kontrol Yönetimi',
    maddeler: [
      'Sol menüde İç Kontrol Yönetimi açıldı. Kamu iç kontrol standartlarına uyum eylem planı, eylemler, birim bildirimleri, kanıt belgeleri ve altı aylık izleme raporu buradadır.',
      'Rolü yönetici verir: İç Kontrol Yönetimi › Tanımlar › Rol Atama. Koordinatör, birim yöneticisi, birim iç kontrol ve risk koordinatörü, izleyici. Kullanıcıya ayrıca Yetkilendirme ekranında İç Kontrol Yönetimi menüsü açılır.',
      'Birim bildirimi girer ve gönderir; koordinatör kesinleştirir veya gerekçeyle iade eder. Kendi bildirimine kimse karar veremez. Kesinleşen bildirim ve belge silinmez; her değişiklik geçmişe yazılır.',
      'İzleme dönemi kilitlenince eylemlerin durumu dondurulur. Rapor Word, PDF ve Excel olarak iner; gerçekleşme oranı eylem sayısına göre hesaplanır.',
    ],
  },
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
