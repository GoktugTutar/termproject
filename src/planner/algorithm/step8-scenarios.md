# ADIM 8 — Olası Senaryo Tablosu

Durum göstergeleri:
- ✓ Karşılanıyor
- ✗ Karşılanmıyor
- ⚠ Kısmen / hatalı karşılanıyor

---

## A — Temel Yerleştirme

| # | Senaryo | Durum | Hangi Dalga | Notlar |
|---|---------|:-----:|-------------|--------|
| A1 | Normal öğrenci, yeterli boş zaman, az ders | ✓ | Dalga 1 | — |
| A2 | Normal öğrenci, yeterli boş zaman, çok ders | ✓ | Dalga 1 | step5 maxSessions'ı artırır |
| A3 | AGIR ders, rahat gün mevcut | ✓ | Dalga 1 | getDayOrder rahat'ı önce sıralar |
| A4 | AGIR ders, sadece yorucu günler var | ✓ | Dalga 1 | Tercih sırası sonunda yorucu'ya gider; score cezalı |
| A5 | HAFIF ders, sadece rahat günler var | ✓ | Dalga 1 | Tercih sırası sonunda rahat'a gider |
| A6 | Tercih saati (preferredStudyTime) tamamen busy | ✓ | Dalga 1 | Başka slota gider; scoreCandidate ceza yazar, programScore yükselir |
| A7 | lessonAllocations = 0 olan ders | ✓ | — | remaining=0, ilk kontrolde atlanır |
| A8 | Tek ders, çok blok (ör. 10 blok) | ✓ | Dalga 1 | Günlere yayılır, round-robin çalışır |

---

## B — Art Arda / Slotlu Mod Kısıtları

| # | Senaryo | Durum | Hangi Dalga | Notlar |
|---|---------|:-----:|-------------|--------|
| B1 | AGIR ders, tek uygun yer art arda gün | ✓ | Dalga 2 | Dalga 1'de atlanır, Dalga 2'de art arda kısıt kalkar |
| B2 | slottedMode ders, 3 üst üste olmak zorunda | ✓ | Dalga 2 | creates3Consecutive kısıtı Dalga 2'de kalkar |
| B3 | Birden fazla AGIR ders, hepsi ardışık günlere denk geliyor | ✓ | Dalga 2 | Farklı dersler birbirinin kısıtını görmez; her biri kendi placedDays'ini kontrol eder |
| B4 | AGIR ders A Pazartesi, AGIR ders B Salı (farklı dersler art arda) | ⚠ | Dalga 1 | Engellenmez. Kullanıcı iki gün üst üste ağır ders çalışır. Global AGIR kontrol yok. |
| B5 | 3 AGIR ders, 3 gün — hepsi farklı günlerde | ✓ | Dalga 1 | Her ders kendi gününe gider |
| B6 | 4 AGIR ders, 3 gün — biri art arda olmak zorunda | ✓ | Dalga 1-2 | Fazla ders Dalga 2'ye düşer |

---

## C — Session / Gün Kapasitesi

| # | Senaryo | Durum | Hangi Dalga | Notlar |
|---|---------|:-----:|-------------|--------|
| C1 | Bir günde maxSessions doldu, başka gün var | ✓ | Dalga 1 | Diğer günlere geçer |
| C2 | Tüm günlerde maxSessions doldu, blok kaldı | ⚠ | Dalga 4 | Dalga 3 bunu çözmeliydi (session 2x) ama çift kilitli: dayBlocksRemaining=0 ve placedDays engeli aynı anda devreye giriyor → Dalga 3 hiç çalışmıyor |
| C3 | deep_focus + çok ders (maxSessions=1 başlangıç) | ✓ | Dalga 1 | step5 maxSessions'ı ceil(lessonCount/days)'e yükseltir |
| C4 | distributed + az ders | ✓ | Dalga 1 | maxSessions=3 geniş kapasite sağlar |
| C5 | Aynı derse aynı günde 2 session gerekiyor (blok > days * maxBlocksPerSession) | ⚠ | Dalga 4 | Dalga 4'te placedDays kontrolü yok → aynı ders aynı güne iki kez girebilir. Bug. |
| C6 | Dalga 4'te bir güne çok fazla session yığılıyor | ⚠ | Dalga 4 | sessionsUsed kontrol edilmediğinden 5-6 session olabilir. Kullanıcı programı absürt görünür. |

---

## D — Pencere Boyutu Kısıtları

| # | Senaryo | Durum | Hangi Dalga | Notlar |
|---|---------|:-----:|-------------|--------|
| D1 | Pencereler tam maxBlocksPerSession büyüklüğünde (ör. 90 dk) | ✓ | Dalga 1 | toPlace=maxBlocksPerSession, pencereye tam girer |
| D2 | Pencereler maxBlocksPerSession'dan büyük | ✓ | Dalga 1 | scoreCandidate en iyi slotu seçer |
| D3 | Pencereler küçük ama remaining=1 (son blok) | ✓ | Dalga 1 | toPlace=min(1,...)=1 → 30 dk yeterli |
| D4 | Pencereler 30-60 dk, remaining ≥ 2 | ✗ | — | toPlace=min(remaining,...,maxBlocksPerSession) ≥ 2 → 60-90 dk aranır → pencere yetersiz → 4 dalga da başarısız → unplaced |
| D5 | Gün içinde çok sayıda 30 dk'lık aralık, hiçbiri 60 dk değil | ✗ | — | Her aralık bağımsız kullanılabilirdi. Sistem hiç denemiyor. |
| D6 | Remaining=3, en büyük pencere 60 dk (2 blok) | ✗ | — | toPlace=3 → 90 dk aranır → başarısız. toPlace=2 denenmiyor. |
| D7 | Tüm günlerin tek boşluğu 30 dk | ✓ | Dalga 1 | Sadece remaining=1 olan ders sığar; diğerleri unplaced |

---

## E — Gün Sayısı / Recalculate Senaryoları

| # | Senaryo | Durum | Hangi Dalga | Notlar |
|---|---------|:-----:|-------------|--------|
| E1 | Tam hafta (7 gün), yeterli kapasite | ✓ | Dalga 1 | — |
| E2 | Recalculate, 3 gün kaldı, 6 ders | ✓ | Dalga 1 | step5: maxSessions=max(2, ceil(6/3))=2, yeterli |
| E3 | Recalculate, 2 gün kaldı, 8 ders | ✓ | Dalga 1 | step5: maxSessions=max(2, ceil(8/2))=4, Dalga 1 çalışır; yeterli pencere varsa |
| E4 | Recalculate, 2 gün kaldı, 8 ders, küçük pencereler | ✗ | — | step5 maxSessions artırır ama toPlace pencereye sığmazsa tüm dalgalar başarısız |
| E5 | Recalculate, 1 gün kaldı, 5 ders | ⚠ | Dalga 1-4 | Her ders farklı session. Pencereler yeterliyse Dalga 1. Yetersizse Dalga 4 (session sınırsız, tek günde yığılma). |
| E6 | Tüm günler tamamen dolu (08:00-24:00) | ✓ | — | freeWindows boş → placeIntoWindows hep false → unplacedLessonIds doğru raporlanır |
| E7 | Bazı günler tamamen dolu, bazıları boş | ✓ | Dalga 1 | Dolu günler atlanır, boş günlere gider |

---

## F — Puanlama ve programLevel Doğruluğu

| # | Senaryo | Durum | Hangi Dalga | Notlar |
|---|---------|:-----:|-------------|--------|
| F1 | Hepsi Dalga 1'de yerleşti | ✓ | Dalga 1 | violationScore=0, programLevel="normal" |
| F2 | Bir kısım Dalga 2'ye düştü | ✓ | Dalga 2 | violationScore artar, programLevel "busy" olabilir |
| F3 | Dalga 4'e düşen bloklar var | ⚠ | Dalga 4 | violationScore hesabı hatalı: WAVE_PENALTY per-entry ekleniyor, per-block değil. blockCount=3 entry, blockCount=1 entry aynı cezayı alıyor. programScore yanıltıcı çıkıyor. |
| F4 | Çok bloklu entry (blockCount=3) Dalga 4'te | ⚠ | Dalga 4 | violationScore += 4 (1 entry). Ama 3 ayrı 1-bloklu entry olsaydı += 12 olurdu. Aynı gerçek durum, 3x farklı skor. |
| F5 | unplacedLessonIds doğru raporlanıyor mu | ✓ | — | Tüm dalgalar bittikten sonra remaining>0 olanlar toplanıyor. Doğru. |

---

## G — Kenar Durumlar

| # | Senaryo | Durum | Hangi Dalga | Notlar |
|---|---------|:-----:|-------------|--------|
| G1 | Hiç ders yok (lessonOrder boş) | ✓ | — | Döngüler çalışmaz, placed=[], programLevel="normal" |
| G2 | Hiç gün yok (planningDays boş) | ✓ | — | dayConfigs boş, tüm dersler unplaced |
| G3 | lessonAllocations eksik bir ders içeriyor | ✓ | — | `remaining[lessonId] = allocations[lessonId] ?? 0`, sıfırla başlar, atlanır |
| G4 | maxBlocksPerSession = 1 (burnout sinyali indirgedi) | ✓ | Dalga 1 | toPlace=1, 30 dk pencere yeterli |
| G5 | freeWindows'ta olmayan bir tarih için dateStr üretilirse | ✓ | — | `freeWindows[dateStr] \|\| []` ile boş array, placeIntoWindows false döner |
| G6 | Aynı ders hem review hem normal blok alıyor | ✓ | — | Review blokları step7_5'te ayrı yerleştiriliyor, step8'e gelmeden freeWindows'tan çıkarılıyor |
| G7 | Dalga 3 → gerçekten hiç çalışmıyor mu? | ⚠ | Dalga 3 | dayBlocksRemaining=0 veya placedDays doluysa hiç işe yaramaz. Sadece teorik olarak: maxSessions dolmadan dayBlocksRemaining dolsaydı çalışırdı. Bu durum mevcut formülde mümkün değil. |

---

## Özet

| Kategori | Toplam | ✓ Karşılanan | ⚠ Kısmi/Hatalı | ✗ Karşılanmayan |
|----------|:------:|:------------:|:--------------:|:---------------:|
| A — Temel yerleştirme | 8 | 8 | 0 | 0 |
| B — Art arda / slotlu mod | 6 | 5 | 1 | 0 |
| C — Session / gün kapasitesi | 6 | 3 | 3 | 0 |
| D — Pencere boyutu | 7 | 3 | 0 | 4 |
| E — Gün sayısı / recalculate | 7 | 5 | 2 | 0 |
| F — Puanlama | 5 | 2 | 3 | 0 |
| G — Kenar durumlar | 7 | 6 | 1 | 0 |
| **Toplam** | **46** | **32** | **10** | **4** |

---

## Öncelikli Düzeltmeler

| Öncelik | Sorun | Etkilenen Senaryolar |
|:-------:|-------|---------------------|
| 1 | `toPlace` pencere boyutuna bakmıyor | D4, D5, D6, E4 |
| 2 | `violationScore` per-entry, per-block değil | F3, F4 |
| 3 | Dalga 4 double-booking (aynı ders aynı güne çift) | C5 |
| 4 | Dalga 3 çift kilitli (fiilen ölü kod) | C2, G7 |
| 5 | Dalga 4 session sınırsız (tek gün aşırı yüklenme) | C6, E5 |
| 6 | Global AGIR art arda kontrolü yok | B4 |
