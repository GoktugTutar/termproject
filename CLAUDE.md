# CLAUDE.md — Study Planner Projesi

Bu dosya projenin tek yetkili referansıdır. Algoritma, veri modeli, API tasarımı ve dosya yapısı burada tanımlıdır.

---

## Tech Stack

| Katman    | Teknoloji                     |
|-----------|-------------------------------|
| Backend   | NestJS (TypeScript)           |
| Veritabanı| PostgreSQL + Prisma ORM       |
| Frontend  | Flutter                       |
| AI        | Claude Haiku API (ileride)    |

---

## Proje Dosya Yapısı

```
termprojectFull/
├── termproject/                        # NestJS uygulaması
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── user/
│   │   │   ├── user.module.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   └── dto/
│   │   ├── planner/
│   │   │   ├── planner.module.ts
│   │   │   ├── planner.controller.ts
│   │   │   ├── planner.service.ts
│   │   │   ├── algorithm/
│   │   │   │   ├── step0-burnout.ts
│   │   │   │   ├── step1-multiplier.ts
│   │   │   │   ├── step2-pool.ts
│   │   │   │   ├── step3-review-blocks.ts
│   │   │   │   ├── step4-calculate-x.ts
│   │   │   │   ├── step5-day-distribution.ts
│   │   │   │   ├── step6-priority.ts
│   │   │   │   ├── step7-cognitive-load.ts
│   │   │   │   ├── step7_5-place-review.ts
│   │   │   │   ├── step8-placement.ts
│   │   │   │   └── step9-recalculate.ts
│   │   │   └── dto/
│   │   ├── checklist/
│   │   │   ├── checklist.module.ts
│   │   │   ├── checklist.controller.ts
│   │   │   ├── checklist.service.ts
│   │   │   └── dto/
│   │   ├── feedback/                   # Kullanıcıdan gelen feedback (weekly/daily)
│   │   │   ├── feedback.module.ts
│   │   │   ├── feedback.controller.ts
│   │   │   ├── feedback.service.ts
│   │   │   └── dto/
│   │   ├── system-feedback/            # Sistemin kullanıcıya verdiği AI destekli mesajlar
│   │   │   ├── system-feedback.module.ts
│   │   │   ├── system-feedback.controller.ts
│   │   │   ├── system-feedback.service.ts
│   │   │   └── ai-prompt.ts
│   │   └── lesson/
│   │       ├── lesson.module.ts
│   │       ├── lesson.controller.ts
│   │       ├── lesson.service.ts
│   │       └── dto/
│   └── package.json
└── termprojectui/                       # Flutter uygulaması
```

---

## Veri Modelleri (Prisma Schema)

```prisma
model User {
  id                  Int              @id @default(autoincrement())
  preferredStudyTime  StudyTime        // morning | afternoon | evening | night
  studyStyle          StudyStyle       // deep_focus | distributed | normal
  busySlots           UserBusySlot[]
  lessons             Lesson[]
  checklists          DailyChecklist[]
  weeklyFeedbacks     WeeklyFeedback[]
  scheduledBlocks     ScheduledBlock[]
}

enum StudyTime {
  morning    // 08:00-11:00
  afternoon  // 12:00-15:00
  evening    // 18:00-21:00
  night      // 21:00-00:00
}

enum StudyStyle {
  deep_focus    // az session, uzun blok
  distributed   // çok session, kısa blok
  normal        // varsayılan
}

model UserBusySlot {
  id           Int     @id @default(autoincrement())
  userId       Int
  user         User    @relation(fields: [userId], references: [id])
  dayOfWeek    Int     // 1=Pazartesi … 7=Pazar
  startTime    String  // "HH:MM"
  endTime      String  // "HH:MM"
  fatigueLevel Int     // 1-5 (kullanıcı girdisi)
}

model Lesson {
  id                 Int           @id @default(autoincrement())
  userId             Int
  user               User          @relation(fields: [userId], references: [id])
  name               String
  difficulty         Int           // 1-5
  keyfiDelayCount    Int           @default(0)
  zorunluDelayCount  Int           @default(0)
  zorunluMissedBlocks Int          @default(0)
  needsMoreTime      Int           @default(0) // -1 | 0 | +1
  exams              LessonExam[]
  deadlines          LessonDeadline[]
  scheduledBlocks    ScheduledBlock[]
}

model LessonExam {
  id        Int      @id @default(autoincrement())
  lessonId  Int
  lesson    Lesson   @relation(fields: [lessonId], references: [id])
  examDate  DateTime
}

model LessonDeadline {
  id           Int      @id @default(autoincrement())
  lessonId     Int
  lesson       Lesson   @relation(fields: [lessonId], references: [id])
  deadlineDate DateTime
  title        String?  // ödev / proje adı (opsiyonel)
}

model ScheduledBlock {
  id         Int      @id @default(autoincrement())
  userId     Int
  user       User     @relation(fields: [userId], references: [id])
  lessonId   Int
  lesson     Lesson   @relation(fields: [lessonId], references: [id])
  date       DateTime // hangi gün
  startTime  String   // "HH:MM"
  endTime    String   // "HH:MM"
  blockCount Int      // kaç blok (1 blok = 30 dk)
  isReview   Boolean  @default(false)
  completed  Boolean  @default(false)
  weekStart  DateTime // bu bloğun hangi haftaya ait olduğu
}

model DailyChecklist {
  id              Int      @id @default(autoincrement())
  userId          Int
  user            User     @relation(fields: [userId], references: [id])
  date            DateTime
  stressLevel     Int      // 1-5
  fatigueLevel    Int      // 1-5
  items           ChecklistItem[]
}

model ChecklistItem {
  id               Int            @id @default(autoincrement())
  checklistId      Int
  checklist        DailyChecklist @relation(fields: [checklistId], references: [id])
  lessonId         Int
  plannedBlocks    Int
  completedBlocks  Int
  delayed          Boolean        @default(false)
}

model WeeklyFeedback {
  id               Int      @id @default(autoincrement())
  userId           Int
  user             User     @relation(fields: [userId], references: [id])
  weekStart        DateTime
  weekloadFeedback String   // "cok_yogundu" | "tam_uygundu" | "yetersizdi"
  lessonFeedbacks  LessonFeedback[]
}

model LessonFeedback {
  id               Int            @id @default(autoincrement())
  weeklyFeedbackId Int
  weeklyFeedback   WeeklyFeedback @relation(fields: [weeklyFeedbackId], references: [id])
  lessonId         Int
  needsMoreTime    Int            // -1 | 0 | +1
}
```

---

## API Endpoints

| Method | Path                        | Modül     | Açıklama                                      |
|--------|-----------------------------|-----------|-----------------------------------------------|
| POST   | /planner/create             | planner   | Haftalık programı oluşturur (Pazar / ilk kurulum) |
| POST   | /planner/recalculate        | planner   | BusySlot değişikliğinde yeniden hesapla (ADIM 9) |
| GET    | /planner/week               | planner   | Haftanın bloklarını getir                     |
| POST   | /checklist/submit           | checklist | Günlük checklist gönder                       |
| GET    | /checklist/:date            | checklist | Günlük checklist getir                        |
| POST   | /feedback/weekly            | feedback        | Kullanıcının haftalık geri bildirimini kaydet |
| GET    | /system-feedback/message    | system-feedback | AI destekli sistem mesajını getir             |
| POST   | /user/setup                 | user      | Kullanıcı tercihlerini kaydet                 |
| PUT    | /user/busy-slots            | user      | BusySlot güncelle                             |
| GET    | /lesson                     | lesson    | Tüm dersleri listele                          |
| POST   | /lesson                     | lesson    | Ders ekle                                     |
| PUT    | /lesson/:id                 | lesson    | Ders güncelle                                 |
| DELETE | /lesson/:id                 | lesson    | Ders sil                                      |
| POST   | /lesson/:id/exam            | lesson    | Sınav tarihi ekle                             |
| POST   | /lesson/:id/deadline        | lesson    | Deadline / ödev ekle                          |
| DELETE | /lesson/:id/deadline/:did   | lesson    | Deadline sil                                  |

---

## Temel Sabitler

```typescript
const BLOCK_MINUTES = 30;
const DEFAULT_WEEKLY_BLOCKS = 28;       // 14 saat / hafta
const PLACEMENT_START = "08:00";
const PLACEMENT_END   = "00:00";        // gece yarısı
const MAX_REVIEW_BLOCKS = 4;            // 2 saat üst sınır
const MIN_REVIEW_BLOCKS = 1;
```

---

## Algoritma — Haftalık Program Oluşturma (`POST /planner/create`)

> İç birim her zaman **blok**tur (1 blok = 30 dk). Ondalıklı değer yoktur.

### ADIM 0 — Tükenmişlik Sinyali

```
weekCompletionRate = son 7 gün (tamamlanan blok) / (planlanan blok)

weekCompletionRate < 0.7
  → tüm gün tiplerinde maxBlocksPerSession -= 1  (alt sınır = 1)
  → FeedbackEvent("haftalik_yuk_azaltildi") üret
```

### ADIM 1 — Haftalık Geri Bildirim Çarpanı

```
WeeklyFeedback.weekloadFeedback:
  "cok_yogundu"  → nextWeekMultiplier = 0.85
  "tam_uygundu"  → nextWeekMultiplier = 1.00   (ilk hafta varsayılanı)
  "yetersizdi"   → nextWeekMultiplier = 1.10
```

### ADIM 2 — Efektif Blok Havuzu

```
effectiveBlocks = floor(DEFAULT_WEEKLY_BLOCKS × nextWeekMultiplier)

Örnekler:
  "cok_yogundu" → floor(28 × 0.85) = 23 blok
  "tam_uygundu" → 28 blok
  "yetersizdi"  → floor(28 × 1.10) = 30 blok

BusySlotlar bu değeri değiştirmez; yerleştirme kısıtı olarak kullanılır (ADIM 8).
Sığmazsa → FeedbackEvent("programiniz_dolu") üret.
```

### ADIM 3 — Sınav Tekrar Bloklarını Ayır

```
Her ders için (sınavı bu hafta içinde):
  reviewBaseBlocks[lesson] =
    (effectiveBlocks × lesson.difficulty) / Σ difficulty
  → clamp(1, 4, değer)

  difficulty < 4:
    sınav günü − 1  → clamp(1,4, round(reviewBaseBlocks × 0.25)) blok
    reservedReviewBlocks'a ekle

  difficulty ≥ 4:
    sınav günü − 1  → clamp(1,4, round(reviewBaseBlocks × 0.20)) blok
    sınav günü − 2  → clamp(1,4, round(reviewBaseBlocks × 0.20)) blok
    reservedReviewBlocks'a ekle

Tekrar bloğu maliyeti henüz ana havuzdan DÜŞÜLMEZ.
ADIM 7.5'te allLessonAllocatedTime'dan düşülür.
```

### ADIM 4 — Ders Bazlı Blok Dağıtımı (calculateX)

```
Giriş: effectiveBlocks (ADIM 2)

Her ders için ağırlık:
  totalDelayCount = keyfiDelayCount + zorunluDelayCount
  delayBonus      = min(totalDelayCount, 2)

  delay > 0:
    effectiveWeight = difficulty + delayBonus
  delay = 0:
    effectiveWeight = max(1, difficulty + needsMoreTime)

Oransal dağıtım:
  X_hamBlocks[lesson] =
    effectiveBlocks × effectiveWeight[lesson] / Σ effectiveWeight

Largest-remainder yöntemiyle tam bloğa çevir:
  X_allocatedBlocks[lesson] = largestRemainder(X_hamBlocks)

Garanti: Σ X_allocatedBlocks = effectiveBlocks

Zorunlu telafi (önceki haftadan):
  zorunluDelayCount > 0 ise
    X_efektifBlocks[lesson] += zorunluMissedBlocks
```

### ADIM 5 — Günlere Blok Dağıtımı

```
Her gün için:
  avgFatigue[gün] = busySlot fatigueLevel ortalaması (busySlot yoksa = 1)
  weight[gün]     = 6 − avgFatigue[gün]

Oransal dağıtım:
  dayBlocks[gün] = floor(effectiveBlocks × weight[gün] / Σ weight)

Kalan bloklar largest-remainder ile en yüksek weight'li günlere +1 eklenir.
Garanti: Σ dayBlocks = effectiveBlocks

studyStyle kuralları (gün tipi belirlendikten sonra):
  deep_focus   → maxSessions = 1, maxBlocksPerSession = 4
  distributed  → maxSessions = 3, maxBlocksPerSession = 2
  normal       → maxSessions = 2, maxBlocksPerSession = 3

cok_yorucu_gun (avgFatigue ≥ 4): maxSessions = 1
rahat_gun      (avgFatigue ≤ 2): maxSessions upper limit kalkar (studyStyle belirler)
```

### ADIM 6 — Ders Öncelik Sırası

```
U = sınava kalan gün sayısı

U ≤ 3   → KRİTİK
U 4–7   → YÜKSEK
U 8–14  → ORTA
U > 14  → DÜŞÜK

Delay etkisi:
  totalDelayCount ≥ 3  → bir kademe yukarı
  totalDelayCount 1–2  → 0.5 kademe yukarı

  keyfiDelayCount > 0  → ders SLOTLU MOD'a alınır
    (aynı ders 3 gün üst üste yerleştirilemez)

Aynı kademedeki dersler difficulty'ye göre sıralanır (zor ders önce).
```

### ADIM 7 — Bilişsel Yük Dengesi

```
KURAL 1: Günde en fazla 1 difficulty≥4 blok.
  İkinci zor ders → sonraki uygun güne taşı.

KURAL 2: Zor dersin ardından hafif ders.
  Sıralama tercihi: difficulty≥4 → difficulty≤2 → difficulty=3

Çelişki: KRİTİK öncelik her kurala karşı kazanır.
```

### ADIM 7.5 — Tekrar Bloklarını Önce Yerleştir

```
Her ders için (sınavı bu hafta olanlar), her atanan tekrar günü için:

1. Zaman dilimi seçimi:
   preferredStudyTime penceresi boşsa → tekrar bloğu oraya
   değilse → freeWindows içindeki ilk uygun slot

2. Yerleştirme:
   Slot freeWindows'a işaret edilir (ADIM 8 bu slotları görmez).

3. Ders hakkından düş:
   allLessonAllocatedTime[lesson] =
     max(0, allLessonAllocatedTime[lesson] − reservedReviewBlocks[lesson])

   0 olursa → SchedulingEvent("sadece_tekrar", lesson)
     Mesaj: "{ders} için bu hafta sadece tekrar zamanı kaldı."

4. cok_yorucu_gun olsa bile tekrar bloğu kaldırılmaz.
   Uyarı: "Sınav yakın, yorucu güne rağmen tekrar bloğu eklendi."

5. Sığmazsa → SchedulingEvent("tekrar_sigmiyor", lesson) → ADIM 9
```

### ADIM 8 — Dersleri Gün/Ders Sınıfı Eşleşmesiyle Yerleştir

```
── GÜN SINIFI (ADIM 5 çıktısından) ──────────────────────────────────
  avgFatigue ≤ 2  →  rahat   (yoğunluk 1)
  avgFatigue = 3  →  normal  (yoğunluk 2)
  avgFatigue ≥ 4  →  yorucu  (yoğunluk 3)

── DERS SINIFI (difficulty + ADIM 6 önceliğinden) ───────────────────
  difficulty ≥ 4  VEYA  öncelik = KRİTİK  →  AGIR   (tercih: rahat)
  difficulty ≤ 2  VE   öncelik = DÜŞÜK    →  HAFIF  (tercih: yorucu)
  diğer                                   →  ORTA   (tercih: normal)

── TERCIH SIRASI ─────────────────────────────────────────────────────
  AGIR   → rahat  → normal  → yorucu
  ORTA   → normal → rahat   → yorucu
  HAFIF  → yorucu → normal  → rahat

── YERLEŞTİRME DÖNGÜSÜ ──────────────────────────────────────────────
freeWindows = 08:00–00:00 − busySlotlar (merge edilmiş)

FOR her ders (öncelik sırasına göre):
  lessonClass = classifyLesson(difficulty, priority)
  dayOrder    = günler[tercih sırası, grup içinde kronolojik]
  kalan       = allLessonAllocatedTime[lesson]
  placedDays  = {} (slotlu mod takibi)

  FOR her gün in dayOrder:
    eğer dayBlocks[gün] = 0 → sonraki güne geç

    slotlu mod aktifse:
      bu güne eklenince takvimde 3 üst üste gün oluşur mu?
        EVET → sonraki güne geç

    placeBlocks = min(kalan, dayBlocks[gün], maxBlocksPerSession)

    freeWindows[gün] içinde placeBlocks ardışık boş slot var mı?
      EVET:
        → preferredStudyTime penceresine dene, yoksa ilk uygun slota
        → dayBlocks[gün] -= placeBlocks
        → kalan -= placeBlocks
        → placedDays.add(gün)
        → gün.yoğunluk > lessonClass.tercihYoğunluk ise:
              programZorlastu = true
      HAYIR:
        → sonraki güne geç

    kalan = 0 → ders tamamlandı

  kalan > 0 (hafta bitti):
    → SchedulingEvent("sigmiyor", lesson) → ADIM 9 + ADIM 10

── PROGRAM ZORLAŞTI FEEDBACK ─────────────────────────────────────────
  programZorlastu = true ise:
    POST /planner/create yanıtında programZorlastu: true döner.
    Mesaj: "Bu hafta ders programı biraz zorlaştı.
            Zor dersler meşgul günlere sığdırıldı — yoğun bir hafta olabilir."
```

### ADIM 9 — Hafta İçi Yeniden Hesaplama

Tetikleyici: `POST /planner/recalculate` (busySlot ekle/sil/değiştir veya günlük uyku sorusu)

```
1. Geçmiş günler kilitlenir.

2. Her ders için kalan blok:
   X_kalanBlocks[lesson] =
     X_efektifBlocks[lesson] − completedBlocks[lesson]
   (completedBlocks = ChecklistItem.completedBlocks toplamı)
   X_kalanBlocks < 0 ise → ders bu hafta tamamlandı, atla.

3. Kalan günler için kapasite:
   dayCapacityBlocks[gün] =
     min(freeBlocksInWindow, maxSessions × maxBlocksPerSession)

4. ADIM 3–8 mantığı kalan günlere uygulanır.

5. Zorunlu delay kontrolü:
   X_kalanBlocks[lesson] > Σ dayCapacityBlocks ise:
     Lesson.zorunluDelayCount += 1
     Lesson.zorunluMissedBlocks += (fark)
     FeedbackEvent("zorunlu_delay", lesson)
     Mesaj: "BusyTime değişikliği nedeniyle {ders} bu haftaya sığmıyor."
```

---

## Algoritma — Günlük Checklist (`POST /checklist/submit`)

### Anlık Etkiler (Aynı Hafta)

```
delayed = true olan ders:
  Lesson.keyfiDelayCount += 1
  → ADIM 9 tetiklenir (kalan bloklar ileri günlere kaydırılır)
  → Sığmazsa: zorunluDelayCount += 1, zorunluMissedBlocks += fark

completedBlocks < plannedBlocks:
  → Fark = boş slotlara blok olarak eklenir

completedBlocks ≥ plannedBlocks:
  → Dersin bu haftaki kalan bloğu serbest bırakılır
  → Serbest blok sonraki öncelikli derse önerilir
```

### Birikimli Etkiler (Sonraki Hafta)

```
weekCompletionRate = son 7 gün (tamamlanan blok / planlanan blok)
  → ADIM 0'da tükenmişlik sinyali

keyfiDelayCount > 0  → ADIM 4 ağırlığı + ADIM 6 öncelik + slotlu mod
zorunluDelayCount > 0 → ADIM 4 ağırlığı + ADIM 6 öncelik + telafi bloğu
```

---

## Kullanıcı Feedback

Kullanıcının sisteme gönderdiği veriler. Algoritmanın girdisidir, doğrudan plan oluşturmayı etkiler.

### `POST /feedback/weekly` — Haftalık Geri Bildirim

```
WeeklyFeedback.weekloadFeedback:
  "cok_yogundu" | "tam_uygundu" | "yetersizdi"
  → ADIM 1'de nextWeekMultiplier belirlenir

LessonFeedback.needsMoreTime:
  -1 | 0 | +1  (ders bazında)
  → ADIM 4'te effectiveWeight hesabında kullanılır
```

### `POST /checklist/submit` — Günlük Checklist

```
DailyChecklist: stressLevel (1-5), fatigueLevel (1-5)
ChecklistItem: plannedBlocks, completedBlocks, delayed (ders bazında)

Anlık etkiler (aynı hafta):
  delayed = true → keyfiDelayCount += 1 → ADIM 9 tetiklenir
  completedBlocks < plannedBlocks → fark ileri günlere kaydırılır
  completedBlocks ≥ plannedBlocks → kalan blok serbest bırakılır

Birikimli etkiler (sonraki hafta):
  weekCompletionRate → ADIM 0 tükenmişlik sinyali
  keyfiDelayCount    → ADIM 4 ağırlık + ADIM 6 öncelik + slotlu mod
  zorunluDelayCount  → ADIM 4 ağırlık + ADIM 6 öncelik + telafi bloğu
```

---

## System Feedback (`GET /system-feedback/message`)

Sistemin kullanıcıya gönderdiği AI destekli mesajlar. **Ders programını etkilemez.**

Algoritma çalışırken ve kullanıcı takibinden toplanan veriler bir prompt'a derlenir,
Claude Haiku bu verilere bakarak Türkçe motive edici / uyarıcı bir metin üretir.

### Veri Kaynakları (prompt'a giden)

```
Planlama olayları:
  notFittedLessons   → bu hafta sığmayan dersler ve eksik blok sayısı
  programZorlastu    → ağır dersler meşgul günlere taşındı mı

Kullanıcı takibi:
  weekCompletionRate → son 7 gün tamamlanan / planlanan blok oranı
  avgStressLevel     → son 7 günün stressLevel ortalaması
  keyfiDelayCount    → ders bazında keyfi erteleme sayısı
  zorunluDelayCount  → ders bazında zorunlu erteleme sayısı

Ders durumu:
  U (sınava kalan gün), difficulty, allLessonAllocatedTime

Geçmiş:
  weekloadFeedback   → kullanıcının geçen haftaki değerlendirmesi
```

### Tetikleyici Durumlar (prompt context'e eklenir)

```
T1 — Sığmayan ders:
  notFittedLessons listesi doluysa → prompt'a eklenir

T2 — Kronik yetersizlik:
  Son 3 haftada weekCompletionRate < 0.6 → prompt'a eklenir

T3 — Aşırı yük:
  weekloadFeedback = "cok_yogundu" (2 hafta üst üste)
  VEYA weekCompletionRate < 0.5 VE avgStress ≥ 4 → prompt'a eklenir

T4-C1 — needsMoreTime=+1 ama blok karşılanamadı → prompt'a eklenir
T4-C2 — keyfiDelayCount ≥ 2 VE son 2 hafta completion < 0.5 → prompt'a eklenir
T4-C3 — U ≤ 7 VE allLessonAllocatedTime < 4 blok → prompt'a eklenir
T5    — programZorlastu = true → prompt'a eklenir
```

Hangi tetikleyicilerin aktif olduğu ve mesaj içeriği Claude Haiku tarafından belirlenir.
Sabit/hardcoded mesaj üretilmez.

---

## Ek Mekanizmalar

### Günlük Sabah Uyku Sorusu

```
Her sabah kullanıcıya sorulur: "Dün gece yeterince uyudun mu?"
  Hayır → o günün maxBlocksPerSession -= 1 (alt sınır = 1)
  Evet  → değişiklik yok

Bu sadece o günü etkiler. ADIM 9 tetiklenir (günlük yeniden hesaplama).
Program kurulurken uyku sinyali yoktur.
```

### Busy Slot Merge

```
Çakışan busySlotlar birleştirilir:
  09:00-11:00 + 10:00-12:00 → 09:00-12:00

Merge işlemi ADIM 8'de freeWindows hesaplanırken uygulanır.
```

### Largest Remainder Yöntemi

```
Oransal dağıtım sonucu ondalıklı blokları tam sayıya çevirirken kullanılır.
ADIM 4 (calculateX) ve ADIM 5 (günlere dağıtım) ikisi de bu yöntemi kullanır.
Garanti: toplam her zaman hedef değere eşittir.
```

---

## Parametre → Etki Tablosu

| Parametre             | Kaynak               | Etkili Olduğu Adım(lar)                        |
|-----------------------|----------------------|------------------------------------------------|
| weekCompletionRate    | DailyChecklist       | ADIM 0 — tükenmişlik sinyali                   |
| weekloadFeedback      | WeeklyFeedback       | ADIM 1 — blok çarpanı                          |
| effectiveBlocks       | ADIM 2 çıktısı       | ADIM 3,4,5 — tüm dağıtımın temeli              |
| examDate + difficulty | LessonExam, Lesson   | ADIM 3 — tekrar bloğu · ADIM 7.5 — yerleştirme|
| needsMoreTime         | WeeklyFeedback       | ADIM 4 — weight (delay=0 ise)                  |
| fatigueLevel          | UserBusySlot         | ADIM 5 — gün ağırlığı                          |
| preferredStudyTime    | User                 | ADIM 7.5, 8 — peak slot seçimi                 |
| keyfiDelayCount       | Lesson               | ADIM 4 weight + ADIM 6 öncelik + slotlu mod    |
| zorunluDelayCount     | Lesson               | ADIM 4 weight + ADIM 6 öncelik + telafi bloğu  |
| U (sınava kalan gün)  | calculateU(lesson)   | ADIM 6 — öncelik kademesi                      |
| difficulty            | Lesson               | ADIM 6,7 — öncelik + bilişsel yük              |
| studyStyle            | User                 | ADIM 5 — session yapısı                        |

---

## Önemli Kurallar (Kod Yazarken Kesinlikle Uyulacak)

1. **Tüm süre matematiği blok cinsindendir.** Ondalıklı blok yoktur; `Math.floor` veya `largestRemainder` kullanılır.
2. **KRİTİK öncelik diğer tüm kurallara karşı kazanır.**
3. **Her modül kendi klasöründe bağımsızdır:** `user`, `planner`, `checklist`, `feedback`, `system-feedback`, `lesson`.
4. **Algoritma adımları `planner/algorithm/` altında ayrı dosyalardadır** (step0 … step9).
5. açıklama satırları yazılıcak her serviceteki fonksiyonlara 
6. şuanki saati eğer .env dosyasında mod=prod yazıyorsa bilgisayarın saatinden yada nereden alıyorsa mod=test yazıyorsa benim değiştirebiliceğim şekilde almasını sağla mesela sadece mod=test olduğu zaman bir pop up çıksın burada saati güncelleyebileyim
