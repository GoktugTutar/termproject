# Planner Algoritması — Detaylı İnceleme

> Bu belge `planner.service.ts` içinde yürütülen 9 adımlık haftalık program oluşturma akışını,
> adımlar arası veri akışını ve özellikle **Adım 8**'in iç mantığını açıklar.

---

## 1. Genel Mimari

```
Kullanıcı İsteği
  └─ POST /planner/create
       └─ PlannerService.createWeeklyPlan()
            │
            ├── ADIM 0  — Tükenmişlik Sinyali      → maxBlocksPerSession
            ├── ADIM 1  — Geri Bildirim Çarpanı    → multiplier
            ├── ADIM 2  — Efektif Blok Havuzu      → effectiveBlocks
            ├── ADIM 3  — Tekrar Bloklarını Ayır   → reviewBlocks, reservedByLesson
            ├── ADIM 4  — Ders Blok Tahsisi        → lessonAllocations
            ├── ADIM 5  — Gün Dağıtımı             → dayConfigs[]
            ├── ADIM 6  — Ders Önceliği            → priorities[]
            ├── ADIM 7  — Bilişsel Yük Sıralaması  → cognitiveOrdered[]
            ├── ADIM 7.5— Tekrar Bloklarını Yerleştir → reviewPlaced, updatedAllocations, updatedFreeWindows
            └── ADIM 8  — Ders Yerleştirme         → lessonPlaced, programScore, programLevel, quality
```

Her adım bir öncekinin çıktısını girdi olarak alır; veri tek yönlü akar.

---

## 2. Adımların Kısa Özeti ve Çıktıları

### ADIM 0 — Tükenmişlik Sinyali (`step0-burnout.ts`)

**Girdi:** Son 7 günde `completedBlocks / plannedBlocks` oranı, `studyStyle`'a göre hesaplanan `defaultMaxBlocks`.

**İşlem:** Tamamlama oranı < 0.70 ise `maxBlocksPerSession` bir azaltılır (alt sınır = 1).

**Çıktı:** `{ maxBlocksPerSession, burnoutDetected }`

---

### ADIM 1 — Geri Bildirim Çarpanı (`step1-multiplier.ts`)

**Girdi:** Son `WeeklyFeedback` kaydındaki `weekloadFeedback` string'i.

**İşlem:**
- `cok_yogundu` → `0.85`
- `tam_uygundu` → `1.00`
- `yetersizdi`  → `1.10`

**Çıktı:** `multiplier: number`

---

### ADIM 2 — Efektif Blok Havuzu (`step2-pool.ts`)

**Girdi:** `multiplier` (Adım 1)

**İşlem:** `effectiveBlocks = floor(28 × multiplier)`

**Çıktı:** `effectiveBlocks: number` (haftanın toplam yerleştirilebilir blok sayısı)

---

### ADIM 3 — Tekrar Bloklarını Ayır (`step3-review-blocks.ts`)

**Girdi:** `lessons[]`, `effectiveBlocks`, `weekStart`, `weekEnd`, `reviewWindowStart`

**İşlem:** Bu hafta (+ sonraki 2 gün) içinde sınavı olan her ders için:
- `difficulty < 4`  → sınav günü−1'e %25 blok (clamp 1-4)
- `difficulty ≥ 4`  → sınav günü−1 ve −2'ye birer %20 blok (clamp 1-4)

**Çıktı:**
```typescript
{
  reviewBlocks: Array<{ lessonId, date, blocks }>,
  reservedByLesson: Record<lessonId, number>
}
```

---

### ADIM 4 — Ders Blok Tahsisi (`step4-calculate-x.ts`)

**Girdi:** `lessons[]`, `effectiveBlocks`

**İşlem:**
1. Her ders için `effectiveWeight` hesaplanır:
   - `totalDelay > 0` → `difficulty + min(totalDelay, 2)`
   - `totalDelay = 0` → `max(1, difficulty + needsMoreTime)`
2. Oransal dağıtım yapılır, **largest-remainder** yöntemi ile tam sayıya çevrilir.
3. Haftalık üst sınır uygulanır: AGIR (diff≥4) → max 4, ORTA → max 8, HAFIF → max 6
4. Taşan bloklar kalan kapasiteli derslere difficulty oranında aktarılır.

**Çıktı:** `lessonAllocations: Record<lessonId, number>`

---

### ADIM 5 — Gün Dağıtımı (`step5-day-distribution.ts`)

**Girdi:** `planningDays[]` (tarih + busySlotlar), `studyStyle`, `maxBlocksPerSession` (Adım 0), `lessonCount`

**İşlem:**
- `studyStyle` → base session yapısı (`deep_focus`: 1×4, `distributed`: 3×2, `normal`: 2×3)
- `minRequiredSessions = ceil(lessonCount / days)` → her dersin haftaya en az bir girebilmesi garantisi
- Her gün için `avgFatigue` ve gün sınıfı (`rahat`/`normal`/`yorucu`) belirlenir

**Çıktı:** `dayConfigs: DayConfig[]`
```typescript
interface DayConfig {
  date: Date;
  dayOfWeek: number;
  maxBlocks: number;           // maxSessions × maxBlocksPerSession
  maxSessions: number;
  maxBlocksPerSession: number;
  avgFatigue: number;
  isCokYorucu: boolean;
  isRahat: boolean;
}
```

---

### ADIM 6 — Ders Önceliği (`step6-priority.ts`)

**Girdi:** `lessons[]`, `now: Date`

**İşlem:**
- Sınava kalan gün `U` → `KRİTİK` (≤3), `YÜKSEK` (≤7), `ORTA` (≤14), `DÜŞÜK` (>14)
- `totalDelay ≥ 3` → bir kademe yukarı yüksel (KRİTİK üzerinde çıkamaz)
- `keyfiDelayCount > 0` → `slottedMode = true` (aynı ders 3 gün üst üste giremez)
- Sıralama skoru: `priorityScore × 10 + difficulty`

**Çıktı:** `priorities: LessonPriority[]` (skor azalan sırada sıralı)

---

### ADIM 7 — Bilişsel Yük Dengesi (`step7-cognitive-load.ts`)

**Girdi:** `priorities[]` (Adım 6'dan), `difficulty` bilgisiyle zenginleştirilmiş

**İşlem:** Ders sırasını bilişsel yük ilkelerine göre düzenler:
- Ardarda gelen AGIR dersleri araya HAFIF ders sokarak ayırır
- KRİTİK öncelik her kurala karşı kazanır

**Çıktı:** `cognitiveOrdered: Array<{ lessonId, difficulty, priority }>` (yeniden sıralanmış)

---

### ADIM 7.5 — Tekrar Bloklarını Yerleştir (`step7_5-place-review.ts`)

**Girdi:** `reviewBlocks[]` (Adım 3), `freeWindows` (busySlot'lardan üretilmiş), `preferredStudyTime`, `lessonAllocations` (Adım 4)

**İşlem:**
1. Tercih edilen saat dilimine yerleştirmeyi dene
2. Sığmazsa ilk uygun slota yerleştir
3. Yerleşen her tekrar bloğu için ilgili dersin `lessonAllocations[lessonId]` değerini düşür (min 0)

**Çıktı:**
```typescript
{
  placed: Array<{ lessonId, date, startMin, endMin, isReview: true, blockCount }>,
  updatedAllocations: Record<lessonId, number>,   // ← Adım 8'e geçer
  updatedFreeWindows: Record<dateStr, TimeWindow[]> // ← Adım 8'e geçer
}
```

---

## 3. Adım 8'e Giren Veriler — Tam Bağlam

`step8Placement()` çağrısı `planner.service.ts`'de şöyle yapılır:

```typescript
step8Placement(
  cognitiveOrdered.map((l) => ({
    lessonId:    l.lessonId,
    slottedMode: slottedModeMap.get(l.lessonId) ?? false,
    difficulty:  l.difficulty,
    priority:    l.priority,
  })),
  updatedAllocations,     // Adım 7.5'ten
  dayConfigs,             // Adım 5'ten
  updatedFreeWindows,     // Adım 7.5'ten
  user.preferredStudyTime // Kullanıcı profili
)
```

| Parametre | Kaynağı | Ne Taşır |
|---|---|---|
| `lessonOrder` | Adım 7 + Adım 6 | Bilişsel yük dengelenmiş, öncelik+zorluk sıralı ders listesi; her ders için `slottedMode` (Adım 6) ile birlikte |
| `lessonAllocations` | Adım 4 → Adım 7.5 | Her ders için haftanın kalan blok kotası (tekrar blokları düşülmüş hali) |
| `dayConfigs` | Adım 5 | Her gün için `maxBlocks`, `maxSessions`, `maxBlocksPerSession`, `avgFatigue`, `isRahat`, `isCokYorucu` |
| `freeWindows` | `planner.service` → Adım 7.5 | Tarih→boş zaman penceresi haritası; busySlotlar çıkarılmış, review blokları da tüketilmiş |
| `preferredStudyTime` | Kullanıcı DB kaydı | `morning` / `afternoon` / `evening` / `night` — tercih edilen çalışma saati |

**Kritik noktalar:**
- `freeWindows` Adım 7.5 tarafından **in-place mutate** edilmiştir; review blokları zaten işaretlenmiştir. Adım 8 bu pencereleri "temiz" bilir ve sadece kalan boş alanlara bakar.
- `lessonAllocations` Adım 7.5'te review blok adedi kadar düşürülmüştür. Adım 8 "ne kadar normal çalışma koymam gerekiyor?" sorusuna bu değerle cevap verir.
- `lessonOrder` sırası Adım 7 tarafından belirlenmiştir; Adım 8 bu sırayı **değiştirmez**, round-robin'in her turunda bu sıraya uyar.

---

## 4. Adım 8 — İç Çalışma Mekanizması

### 4.1 Temel Veri Yapıları

```typescript
// Ders sınıfı: zorluk × öncelik kombinasyonu
type LessonClass = 'AGIR' | 'ORTA' | 'HAFIF';

// Gün sınıfı: avgFatigue'den türetilen
type DayClass = 'rahat' | 'normal' | 'yorucu';

// Yerleştirilen her blok için kayıt
interface PlacedBlock {
  lessonId:  number;
  date:      Date;
  startMin:  number;
  endMin:    number;
  blockCount: number;
  isReview:  false;
  waveUsed:  1 | 2 | 3 | 4 | 5; // hangi dalganın yerleştirdiği
}
```

### 4.2 Sınıflandırma Mantığı

**Ders sınıfı:**
```
difficulty ≥ 4  VEYA  priority = 'KRITIK'  →  AGIR
difficulty ≤ 2  VE    priority = 'DUSUK'   →  HAFIF
diğer                                       →  ORTA
```

**Gün sınıfı:**
```
avgFatigue ≤ 2  →  rahat
avgFatigue = 3  →  normal
avgFatigue ≥ 4  →  yorucu
```

**Tercih sırası (ders sınıfına göre optimal gün arayışı):**
```
AGIR   →  rahat  → normal  → yorucu
ORTA   →  normal → rahat   → yorucu
HAFIF  →  yorucu → normal  → rahat
```
Felsefe: Ağır dersler dinç günlerde çalışılır; hafif dersler yorucu günlere bırakılır, böylece "iyi günler" ağır içerik için korunur.

---

### 4.3 Beş Dalga Sistemi

Adım 8'in temel stratejisi art arda uygulanan 5 dalgadır. Her dalga bir öncekinde yerleştirilemeyenleri üstlenir ve bunu yaparken kısıtları kademeli olarak gevşetir.

```
DALGA 1 — Tüm kısıtlar aktif
  ├─ dayBlocksRemaining > 0 kontrolü
  ├─ placedDays.has(gün) → aynı ders o güne 1 oturumdan fazla giremez
  ├─ sessionsUsed < maxSessions
  ├─ AGIR ders: bitişik günlerde zaten varsa → atla
  ├─ slottedMode: 3 üst üste gün oluşuyorsa → atla
  └─ Gün sırası: getDayOrder() — tercih sınıfına göre

DALGA 2 — Art arda kısıtlar kaldırıldı
  └─ AGIR art arda yasağı ve slottedMode 3'lü zincir kuralı devre dışı

DALGA 3 — Küçük pencereye step-down
  └─ Tam session sığmıyorsa toPlace değeri maxBPS'den 1'e kadar azaltılır
     (tek 30 dk'lık bir slota bile yerleştirilir)

DALGA 4 — Session overflow
  ├─ effectiveMaxSessions = maxSessions × 2
  └─ Gün sırası: kronolojik (tercih sırasına bakılmaz)

DALGA 5 — Zorla yerleştirme
  ├─ dayBlocksRemaining bütçesi görmezden gelinir
  ├─ sessionsUsed, placedDays art arda kontrolleri → yok
  ├─ Gün sırası: kronolojik
  └─ step-down ile en küçük slota sığdır
```

Her dalga **WHILE (progress)** döngüsüyle çalışır: ilerleyebildiği sürece döner. Her turda her ders için en fazla 1 session yerleştirilir (round-robin), sonra sıradaki derse geçilir. Bu sayede tek bir ders tüm kapasiteyi tüketemez.

---

### 4.4 Slot Puanlama (`scoreCandidate`)

Bir güne birden fazla boş pencere varken hangisinin seçileceğini puanlama sistemi belirler. Her 30 dakikalık kaydırmayla üretilen "candidate" slotlar bu puanla sıralanır, en yüksek puan kazanır.

```
Tercih saatiyle örtüşme:
  tam örtüşme  (≥1.0)  →  +30 puan
  kısmi örtüşme (≥0.5) →  +15 puan
  az örtüşme   (>0)    →  +5 puan

AGIR derste ek kurallar:
  tam örtüşme            →  +20 (ek bonus)
  örtüşme yok            →  −15
  rahat gün              →  +15
  yorucu gün             →  −20

HAFIF ders + örtüşme yok →  +5 (zor derslere peak saat bırakılır)

Örtüşme yoksa → 4 pencere arasındaki uzaklığa göre ceza:
  (pencereler: morning 08-11, afternoon 12-15, evening 18-21, night 21-24)
  1 pencere uzakta  →  −5
  2 pencere uzakta  →  −15
  3+ pencere uzakta →  −25
```

---

### 4.5 Pencere Yönetimi (`splitWindow`)

Bir blok yerleştirildikten sonra kullanılan zaman dilimi mevcut pencereden çıkarılır ve pencere ikiye bölünür:

```
Orijinal pencere: [08:00 → 12:00]
Yerleştirilen:    [09:00 → 10:00] (2 blok = 60 dk)

Kalan:            [08:00 → 09:00] + [10:00 → 12:00]
```

Adım 8 bu "canlı pencere listesi" üzerinde çalışır; her yerleştirmeden sonra güncellenir.

---

### 4.6 Program Puanı ve Seviyesi

Her blok için hangi dalgada yerleştirildiğine göre ceza puanı atanır:

```
WAVE_PENALTY: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 5 }

violationScore = Σ WAVE_PENALTY[block.waveUsed]
programScore   = violationScore / (totalBlocks × 5)

programLevel:
  programScore < 0.15  →  "normal"
  programScore < 0.45  →  "busy"
  programScore ≥ 0.45  →  "very_busy"
```

Dalga 1'de yerleşen bloklar ceza almaz. Dalga 5'e düşen her blok 5 ceza puanı alır çünkü kısıtların tamamı esnetilmiştir; bu, programın fiziksel olarak yoğun olduğuna işaret eder.

---

### 4.7 Kalite Değerlendirmesi (`evaluateScheduleQuality`)

Program tamamlandıktan sonra 4 boyutlu kalite metrikleri hesaplanır:

```
fitRate      = yerleşen_blok / istenen_blok          (Ağırlık: 0.40)
timingRate   = tercih saatiyle örtüşen blok oranı     (Ağırlık: 0.25)
dayMatchRate = ders sınıfı × gün tipi uyum oranı     (Ağırlık: 0.25)
densityScore = aktif günlerin kapasite doluluk dengesi (Ağırlık: 0.10)

qualityScore = fitRate×0.40 + timingRate×0.25 + dayMatchRate×0.25 + densityScore×0.10

qualityLevel:
  ≥ 0.80  →  "good"
  ≥ 0.50  →  "acceptable"
  < 0.50  →  "poor"
```

**dayMatchRate** için kullanılan uyum skoru:
```
AGIR × rahat  = 1.0 | AGIR × normal = 0.5 | AGIR × yorucu = 0.0
ORTA × normal = 1.0 | ORTA × rahat  = 0.7 | ORTA × yorucu = 0.3
HAFIF× yorucu = 1.0 | HAFIF× normal = 0.7 | HAFIF× rahat  = 0.4
```

**densityScore** hesabı: Her aktif gün için `sessionsUsed / maxSessions` oranı hesaplanır. Oran ≤ 1.0 ise `1.0`, aşıyorsa `1.0/oran` (ceza). Tüm aktif günlerin ortalaması alınır.

---

## 5. Adım 8'in Çıktısı

```typescript
interface PlacementResult {
  placed:            PlacedBlock[];       // yerleştirilen tüm ders blokları
  programScore:      number;              // 0.0–1.0, yüksek = kötü
  programLevel:      'normal'|'busy'|'very_busy';
  forcedBlocks:      number;              // dalga 4-5 üzerinden yerleşen blok sayısı
  unplacedLessonIds: number[];            // hiç yerleştirilemeyen dersler
  quality:           ScheduleQuality;    // 4 boyutlu kalite metrikleri
}
```

Bu çıktı `planner.service.ts` tarafından şöyle kullanılır:
- `placed` → `reviewPlaced` ile birleştirilerek `ScheduledBlock` tablosuna yazılır
- `programScore`, `programLevel`, `forcedBlocks`, `unplacedLessonIds`, `quality` → HTTP yanıtında ve `system-feedback` promptunda kullanılır
- `unplacedLessonIds` → UI kullanıcıya bildirim gösterir

---

## 6. Veri Akışı Özet Şeması

```
ADIM 0 ─────────────────────────────────────────► maxBlocksPerSession
                                                        │
ADIM 1 ──────────────────────────────► multiplier       │
                                             │          │
ADIM 2 ───────────────────► effectiveBlocks ◄───────────┘
                                    │
              ┌─────────────────────┼─────────────────┐
              ▼                     ▼                  ▼
           ADIM 3              ADIM 4              ADIM 5
        reviewBlocks        lessonAllocations     dayConfigs
              │                     │
              │              ADIM 6 ─► priorities
              │                     │
              │              ADIM 7 ─► cognitiveOrdered
              │                     │
              ▼                     ▼
           ADIM 7.5 ─────────────────────────────────────┐
     (reviewBlocks + freeWindows + lessonAllocations)     │
              │                                           │
              ▼                                           │
         updatedAllocations ─────────────────────► ADIM 8│
         updatedFreeWindows ─────────────────────► ADIM 8│◄── dayConfigs
         reviewPlaced        cognitiveOrdered ───► ADIM 8│◄── preferredStudyTime
                                                         │
                                                  PlacementResult
                                                  (placed, score, quality)
```

---

## 7. Tasarım Prensipleri ve Önemli Kararlar

### Neden 5 dalga?
Tek geçişli yerleştirme çok erken takılır. 5 dalga sistemi en iyi kaliteyi önce dener (Dalga 1: tüm kısıtlar), başarısız olunca bir kısıtı gevşeterek tekrar dener. Bu şekilde her ders mümkün olan en az kısıt esnetmesiyle yerleştirilir.

### Neden round-robin?
Her turda her ders için en fazla 1 session yerleştirilmesi, "güçlü" bir dersin tüm kapasiteyi tüketmesini engeller. KRİTİK bir ders bile diğer derslerin sıfır gün almasına sebep olamaz.

### Neden freeWindows in-place mutate edilir?
Adım 7.5 ve Adım 8 aynı fiziksel kısıdı (kullanılabilir zaman) paylaşır. Pencereler in-place güncellendiğinde review blokları ile normal bloklar **çakışmaz** — ayrı bir çakışma kontrolüne gerek kalmaz.

### Neden lessonAllocations Adım 7.5'te düşürülür?
Tekrar bloğu bir dersin "çalışma süresinin" bir parçasıdır. O blok zaten review olarak yerleştirildiğinden Adım 8'in aynı dersi tekrar aynı süre kadar çalıştırması gerekmez. Bu düşürme, toplam çalışma yükünü sabit tutarken hangi parçanın review, hangi parçanın yeni çalışma olduğunu net ayırır.

### `programScore` ile `qualityScore` farkı nedir?
- `programScore`: **Yerleştirme sürecinin zorluğunu** ölçer. Yüksek olması dalga 4-5'e çok düşüldüğünü, yani programın fiziksel olarak sıkıştırıldığını gösterir.
- `qualityScore`: **Sonucun kalitesini** ölçer. Tercih saatlerine, gün-ders uyumuna, fitRate'e bakarak yerleşimin "iyi" mi "kötü" mü yapıldığını söyler.

İkisi bağımsız ölçütlerdir: bir program `programLevel = normal` ama `qualityLevel = poor` olabilir (her şey yerleşmiş ama hep yanlış saatte).
