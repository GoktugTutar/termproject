# ADIM 8 — Senaryo Tablosu (5 Dalga Sistemi)

## Dalga Yapısı

| # | Art-arda/Slotted | toPlace | maxSessions | Ceza |
|---|:---------------:|:-------:|:-----------:|:----:|
| Dalga 1 | ✓ var | maxBPS (sabit) | base | 0 |
| Dalga 2 | ✗ yok | maxBPS (sabit) | base | 1 |
| Dalga 3 | ✗ yok | **maxBPS → 1 step-down** | base | 2 |
| Dalga 4 | ✗ yok | maxBPS (sabit) | base × 2 | 3 |
| Dalga 5 | ✗ yok | **maxBPS → 1 step-down** | sınırsız | 5 |

- **Her dalga yalnızca önceki dalgada kalan (remaining > 0) dersler üzerinde çalışır.**
- **Step-down**: toPlace = maxBPS → başarısız → maxBPS-1 → … → 1 → hepsi başarısızsa bu gün atlanır.

---

Durum göstergeleri:
- ✓ Karşılanıyor
- ✗ Karşılanmıyor
- ⚠ Kısmen / hatalı karşılanıyor

---

## A — Temel Yerleştirme

| # | Senaryo | Durum | Dalga | Notlar |
|---|---------|:-----:|-------|--------|
| A1 | Normal öğrenci, yeterli boş zaman, az ders | ✓ | 1 | — |
| A2 | Normal öğrenci, yeterli boş zaman, çok ders | ✓ | 1 | step5 maxSessions'ı artırır |
| A3 | AGIR ders, rahat gün mevcut | ✓ | 1 | getDayOrder rahat'ı önce sıralar |
| A4 | AGIR ders, sadece yorucu günler var | ✓ | 1 | Tercih sırası sonunda yorucu'ya gider; score cezalı |
| A5 | HAFIF ders, sadece rahat günler var | ✓ | 1 | Tercih sırası sonunda rahat'a gider |
| A6 | Tercih saati (preferredStudyTime) tamamen busy | ✓ | 1 | Başka slota gider; scoreCandidate ceza yazar |
| A7 | lessonAllocations = 0 olan ders | ✓ | — | remaining=0, ilk kontrolde atlanır |
| A8 | Tek ders, çok blok (ör. 10 blok) | ✓ | 1 | Günlere yayılır, round-robin çalışır |

---

## B — Art Arda / Slotlu Mod Kısıtları

| # | Senaryo | Durum | Dalga | Notlar |
|---|---------|:-----:|-------|--------|
| B1 | AGIR ders, tek uygun yer art arda gün | ✓ | 2 | Dalga 1'de atlanır, Dalga 2'de art arda kısıt kalkar |
| B2 | slottedMode ders, 3 üst üste olmak zorunda | ✓ | 2 | creates3Consecutive kısıtı Dalga 2'de kalkar |
| B3 | Birden fazla AGIR ders, hepsi ardışık günlere denk geliyor | ✓ | 2 | Farklı dersler birbirinin kısıtını görmez |
| B4 | AGIR ders A Pazartesi, AGIR ders B Salı (farklı dersler art arda) | ⚠ | 1 | Engellenmez; her ders sadece kendi placedDays'ini kontrol eder |
| B5 | 3 AGIR ders, 3 gün — hepsi farklı günlerde | ✓ | 1 | Her ders kendi gününe gider |
| B6 | 4 AGIR ders, 3 gün — biri art arda olmak zorunda | ✓ | 1-2 | Fazla ders Dalga 2'ye düşer |

---

## C — Session / Gün Kapasitesi

| # | Senaryo | Durum | Dalga | Notlar |
|---|---------|:-----:|-------|--------|
| C1 | Bir günde maxSessions doldu, başka gün var | ✓ | 1 | Diğer günlere geçer |
| C2 | Tüm günlerde maxSessions doldu, blok kaldı | ✓ | 4 | Dalga 4 maxSessions × 2 ile dener |
| C3 | deep_focus + çok ders (maxSessions=1 başlangıç) | ✓ | 1 | step5 maxSessions'ı ceil(lessonCount/days)'e yükseltir |
| C4 | distributed + az ders | ✓ | 1 | maxSessions=3 geniş kapasite sağlar |
| C5 | Aynı derse aynı günde 2 session gerekiyor | ⚠ | 5 | Dalga 5'te placedDays kontrolü yok → aynı ders aynı güne iki kez girebilir |
| C6 | Dalga 5'te bir güne çok fazla session yığılıyor | ⚠ | 5 | sessionsUsed kontrol edilmediğinden 5-6 session olabilir |

---

## D — Pencere Boyutu Kısıtları

| # | Senaryo | Durum | Dalga | Notlar |
|---|---------|:-----:|-------|--------|
| D1 | Pencereler tam maxBlocksPerSession büyüklüğünde (ör. 90 dk) | ✓ | 1 | toPlace=maxBPS, pencereye tam girer |
| D2 | Pencereler maxBlocksPerSession'dan büyük | ✓ | 1 | scoreCandidate en iyi slotu seçer |
| D3 | Pencereler küçük ama remaining=1 (son blok) | ✓ | 1 | toPlace=1 → 30 dk yeterli |
| D4 | Pencereler 30-60 dk, remaining ≥ 2 | ✓ | 3 | **Dalga 3 step-down:** toPlace=2 → başarısız → toPlace=1 → 30 dk yeterli |
| D5 | Günde çok sayıda 30 dk'lık aralık, hiçbiri 60 dk değil | ✓ | 3 | **Dalga 3 step-down:** her session için toPlace=1; her aralığa 1 blok |
| D6 | Remaining=3, en büyük pencere 60 dk (2 blok) | ✓ | 3 | **Dalga 3 step-down:** toPlace=3 → başarısız → toPlace=2 → yerleşir; kalan 1 blok sonraki iterasyonda |
| D7 | Tüm günlerin tek boşluğu 30 dk | ✓ | 1-3 | remaining=1 olan ders Dalga 1'de; remaining≥2 olanlar Dalga 3'te toPlace=1 ile |

---

## E — Gün Sayısı / Recalculate Senaryoları

| # | Senaryo | Durum | Dalga | Notlar |
|---|---------|:-----:|-------|--------|
| E1 | Tam hafta (7 gün), yeterli kapasite | ✓ | 1 | — |
| E2 | Recalculate, 3 gün kaldı, 6 ders | ✓ | 1 | step5: maxSessions=max(2, ceil(6/3))=2, yeterli |
| E3 | Recalculate, 2 gün kaldı, 8 ders | ✓ | 1 | step5: maxSessions=max(2, ceil(8/2))=4; pencereler yeterliyse |
| E4 | Recalculate, 2 gün kaldı, 8 ders, küçük pencereler | ✓ | 3 | **Dalga 3 step-down:** pencere küçükse toPlace azalır, 30 dk'ya kadar iner |
| E5 | Recalculate, 1 gün kaldı, 5 ders | ⚠ | 1-5 | Dalga 5'te tek günde session yığılması olabilir |
| E6 | Tüm günler tamamen dolu (08:00-24:00) | ✓ | — | freeWindows boş → tüm dersler unplacedLessonIds'e girer |
| E7 | Bazı günler tamamen dolu, bazıları boş | ✓ | 1 | Dolu günler atlanır, boş günlere gider |

---

## F — Puanlama ve programLevel

| # | Senaryo | Durum | Dalga | Notlar |
|---|---------|:-----:|-------|--------|
| F1 | Hepsi Dalga 1'de yerleşti | ✓ | 1 | violationScore=0, programLevel="normal" |
| F2 | Bir kısım Dalga 2-3'e düştü | ✓ | 2-3 | violationScore artar (ceza 1-2), programLevel "busy" olabilir |
| F3 | Dalga 4-5'e düşen bloklar var | ⚠ | 4-5 | violationScore per-entry ekleniyor, per-block değil; blockCount=3 entry ile blockCount=1 entry aynı cezayı alıyor |
| F4 | Çok bloklu entry (blockCount=3) Dalga 5'te | ⚠ | 5 | violationScore += 5 (1 entry). Ama 3 ayrı 1-bloklu entry olsaydı += 15 olurdu |
| F5 | unplacedLessonIds doğru raporlanıyor mu | ✓ | — | Tüm dalgalar bittikten sonra remaining>0 olanlar toplanır |
| F6 | qualityScore hesabı | ✓ | — | fitRate×0.40 + timingRate×0.25 + dayMatchRate×0.25 + densityScore×0.10 |

---

## G — Kenar Durumlar

| # | Senaryo | Durum | Dalga | Notlar |
|---|---------|:-----:|-------|--------|
| G1 | Hiç ders yok (lessonOrder boş) | ✓ | — | Döngüler çalışmaz, placed=[], programLevel="normal" |
| G2 | Hiç gün yok (planningDays boş) | ✓ | — | dayConfigs boş, tüm dersler unplaced |
| G3 | lessonAllocations eksik bir ders içeriyor | ✓ | — | `remaining[lessonId] = allocations[lessonId] ?? 0`, sıfırla başlar |
| G4 | maxBlocksPerSession = 1 | ✓ | 1 | toPlace=1, step-down gereksiz; 30 dk pencere yeterli |
| G5 | freeWindows'ta olmayan bir tarih için dateStr üretilirse | ✓ | — | `freeWindows[dateStr] \|\| []` ile boş array döner |
| G6 | Aynı ders hem review hem normal blok alıyor | ✓ | — | Review blokları step7_5'te ayrı yerleştiriliyor |
| G7 | Dalga 3 step-down, maxBPS=1 olan bir gün | ✓ | 3 | İlk deneme (tp=1) zaten maxBPS; döngü tek adımda çalışır |

---

## Özet

| Kategori | Toplam | ✓ | ⚠ | ✗ |
|----------|:------:|:-:|:-:|:-:|
| A — Temel yerleştirme | 8 | 8 | 0 | 0 |
| B — Art arda / slotlu mod | 6 | 5 | 1 | 0 |
| C — Session / gün kapasitesi | 6 | 4 | 2 | 0 |
| D — Pencere boyutu | 7 | 7 | 0 | 0 |
| E — Gün sayısı / recalculate | 7 | 6 | 1 | 0 |
| F — Puanlama | 6 | 3 | 3 | 0 |
| G — Kenar durumlar | 7 | 7 | 0 | 0 |
| **Toplam** | **47** | **40** | **7** | **0** |

---

## Dalga 3 ile Giderilen Sorunlar

| Senaryo | Önceki Durum | Yeni Durum | Açıklama |
|---------|:------------:|:----------:|----------|
| D4 | ✗ | ✓ | 30-60 dk pencere, remaining≥2 → step-down toPlace=1 |
| D5 | ✗ | ✓ | Dağınık 30 dk'lık aralıklar → her birine 1 blok |
| D6 | ✗ | ✓ | remaining=3, pencere 60 dk → 2 sonra 1 |
| E4 | ✗ | ✓ | Recalculate + küçük pencere → step-down kurtarır |

---

## Kalan Sorunlar (Öncelik Sırasına Göre)

| Öncelik | Sorun | Etkilenen |
|:-------:|-------|-----------|
| 1 | `violationScore` per-entry, per-block değil | F3, F4 |
| 2 | Dalga 5 double-booking (aynı ders aynı güne çift session) | C5 |
| 3 | Dalga 5 session sınırsız (tek gün aşırı yüklenme) | C6, E5 |
| 4 | Global AGIR art arda kontrolü yok (farklı dersler) | B4 |
