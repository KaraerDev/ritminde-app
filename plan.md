# Ritminde — Uygulama Planı

## Kapsam ve ürün kararları

- Uygulamanın kullanıcıya gösterilen adı **Ritminde** olacak. Expo proje slug'ı, scheme'i ve üretilmiş iOS/Android bundle kimlikleri mevcut oturumları ve deep-link akışını bozmamak için korunacak.
- Üye girişi ve üyelik mevcut Manus OAuth akışında kalacak. Günlük görev, ayar ve takvim verisi hesap bazlı yerel saklama alanında tutulacak; hesaplar birbirinin verisini görmeyecek.
- Günlük görevlerin açık saatleri korunacak, saatsiz adımlar uygun aralıklara yerleşecek. Türkçe aktivite adı sınıflandırılarak görev kartı için bir simge ve ölçülü odak animasyonu seçilecek.
- Yeni **Takvim** sekmesi aylar arasında gezinme, bir tarihe gelecek plan ekleme/düzenleme/silme, yerel başlangıç saati ve süre seçimi ile etkinlik başına hatırlatma aralığı seçimi sağlayacak. Tarihli planlar gün değişince sıfırlanmayacak; günlük görevlerin gün anahtarından ayrı, aynı hesap alanında kalıcı olacak.
- Takvim bildirimleri cihazda yerel olarak zamanlanacak. Tarih/saat cihazın yerel saat diliminde yorumlanacak; işletim sistemi izin vermezse etkinlik kaydı korunup kullanıcı bilgilendirilecek. Web önizlemesinde takvim arayüzü çalışacak; uygulama kapalıyken yerel alarm/bildirim cihazlı iOS/Android uygulamasına bağlı.
- Ayarlar ve İlerleme sekmelerinin mevcut tasarımı korunacak; ad ve marka imzası kullanıcıya gösterilen metinlerde güncellenecek.

## Tasarım yönü

- **Hareket:** Sıcak editoryal minimalizm ile yumuşak geometrik mobil arayüz.
- **İlkeler:** Ritim duygusu, sakin ama neşeli geri bildirim, kolay taranan zaman çizelgesi, tek elle kullanılabilen kontroller.
- **Renk:** Korunan imza çam yeşili `#244B3F`; kâğıt tonu zemin ve adaçayı yüzeyler sakinliği, mercan `#E58A72` küçük tamamlanma noktalarını, açık kehribar isteğe bağlı durum vurgusunu taşır. Yeni kategori renkleri mevcut ayarlar/ilerleme paletini bozmadan Gün ve Takvim ekranlarında küçük yüzeylerde kullanılır.
- **Yerleşim:** Yukarıdan aşağı editoryal akış; Gün'de selam/ilerleme, motive edici özet widget'ları, kategori ikonlu görev çizelgesi. Takvim'de aylık 7-sütun tarih seçici ve altında seçili günün etkinlik kartları.
- **İmza öğeleri:** Yükselen güne dönüşen yol ve mercan kilometretaşı noktası biçimindeki yeni logo; zaman çizelgesinde ince akış çizgisi; etkinlik türüne göre basit ikon ve renk.
- **Etkileşim/animasyon:** Önemli kontroller en az 44 px dokunma alanı ve anlamlı erişilebilir etikete sahip. Görev simgesi aktiviteye göre belirir; yalnız odak sayacı çalışan görev hafifçe canlanır. Sürekli/çoklu hareket yok; sistem azaltılmış-hareket ayarı daima üstün.
- **Tipografi:** Platform sistem sans'ı (iOS SF Pro, Android Roboto); 26–30 px ekran başlığı, 18–22 px bölüm başlığı, 14–16 px temel metin, 11–12 px yardımcı metin. Logo sözcük işareti görsel dosyada raster yazı olarak değil canlı, erişilebilir metin olarak basılır.
- **Marka özü:** “Günü kendi ritminde kur.” Planlayıcının kişiliği: sakin, cesaretlendirici, net. Mikro kopya örnekleri: “Tek adım da güzel bir başlangıç.” ve “Planın değişebilir; bugün yeniden başlayabilirsin.”
- **Logo:** Mevcut beğenilen şeffaf simge korunur; eğri yol/güneş/mercan nokta formu oturum ve üye ol ekranı, Gün ve Takvim başlıklarında aynı asset üzerinden kullanılır. Kare launcher ve uygulama varlıkları da bu simgeden türetilir.

## Uygulama yapısı

- `app/_layout.tsx`: Ritminde web metadata'sı; Auth ve Planner sağlayıcıları.
- `app/auth.tsx`, `app/oauth/callback.tsx`: Mevcut güvenli Manus OAuth giriş, üye ol ve callback ekranı.
- `app/(tabs)/index.tsx`: Gün, motive edici ve kişiye göre değişen widget'lar, kategori animasyonlu görev çizelgesi.
- `app/(tabs)/calendar.tsx`: Yeni aylık takvim, seçili gün planları ve hatırlatıcı yönetimi.
- `app/(tabs)/progress.tsx`, `settings.tsx`: Mevcut görsel yerleşim korunur; marka adı ve hatırlatıcı tercihinin kapsamı güncellenir.
- `app/(tabs)/_layout.tsx`: Dört sekme; Gün, Takvim, İlerleme, Ayarlar.
- `components/planner/BrandLogo.tsx`: Oturum, Gün ve Takvim ekranlarında tek ortak logo bileşeni.
- `components/planner/ActivityGlyph.tsx`: Görev dilini sınıflandırıp erişilebilir kategori simgesi ve azaltılmış-hareket uyumlu animasyon sunar.
- `components/planner/CalendarMonth.tsx`, `CalendarEventEditor.tsx`: Aylık tarih seçici ve etkinlik giriş paneli.
- `lib/planner/activity-category.ts`: Türkçe görev sözcüklerini kategoriye çeviren saf, test edilebilir yardımcı.
- `lib/planner/calendar.ts`: Yerel tarih/saat anahtarı, ay ızgarası ve hatırlatma zamanını hesaplayan saf yardımcılar.
- `lib/planner/types.ts`, `PlannerProvider.tsx`: Hesap anahtarı altında güne bağlı görevlerle ayrı tarihe bağlı takvim planlarını saklama; CRUD ve yerel bildirim kimlikleri. `lib/planner/state.ts` gün devrinde yalnız günlük görev/zamanlayıcıyı yenileyip gelecekteki planları korur.
- `lib/planner/notifications.ts`: Görev ve gelecek takvim etkinlikleri için mevcut Expo yerel bildirim altyapısını kullanma; eski etkinliği düzenlerken veya silerken eski alarmı iptal etme.
- `assets/images/`, `scripts/create-brand-assets.py`: Logo kaynağı ile Expo simge/açılış/adaptif simge varyantları.
- `tests/`: Türkçe kategori, takvim tarih/saat dilimi ve hatırlatma aralığı hesaplama, gün devrinde gelecek planlarının korunması, çoklu saatli görev ayrımı ve mevcut planlama/OAuth regresyonlarını doğrulama.

## Uygulama tercihleri

- Yeni üçüncü taraf paket eklemeden React Native `Animated`, mevcut `Ionicons`, `expo-notifications` ve AsyncStorage kullan.
- Gelecek etkinlik hatırlatıcısı her etkinlikte kullanıcı tarafından seçilir; `gentleSound` tonu uygulanır. Günlük görev hatırlatıcılarının günlük üst sınırı açıkça yalnızca bugünkü görev akışına aittir; takvim planları bu sınırdan bağımsız tek-seferlik bildirimlerdir.
- Ay seçici bugünkü/gelecek tarihleri gösterir, saati geçmiş etkinlik için yeni hatırlatma kurulmasını engeller. Etkinlik kaydı cihaz bildirim izni reddedilse bile korunur ve izin eksikliği görünür bildirilir.
