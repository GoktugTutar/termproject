# CLAUDE.md — Study Planner Projesi

Bu dosya projenin tek yetkili referansıdır. Algoritma, veri modeli, API tasarımı ve dosya yapısı burada tanımlıdır.

---

## Tech Stack

| Katman     | Teknoloji                      |
|------------|--------------------------------|
| Backend    | NestJS (TypeScript)            |
| Veritabanı | PostgreSQL + Prisma ORM        |
| Frontend   | Flutter                        |
| AI         | Claude Haiku API               |
| Auth       | JWT (passport-jwt + bcrypt)    |

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
│   │   ├── auth/                       # JWT kimlik doğrulama
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── jwt.strategy.ts
│   │   │   └── dto/
│   │   │       ├── login.dto.ts
│   │   │       └── register.dto.ts
│   │   ├── user/
│   │   │   ├── user.module.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   └── dto/
│   │   │       ├── setup-user.dto.ts
│   │   │       └── update-busy-slots.dto.ts
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
│   │   │       └── submit-checklist.dto.ts
│   │   ├── feedback/                   # Kullanıcıdan gelen feedback (weekly/daily)
│   │   │   ├── feedback.module.ts
│   │   │   ├── feedback.controller.ts
│   │   │   ├── feedback.service.ts
│   │   │   └── dto/
│   │   │       └── weekly-feedback.dto.ts
│   │   ├── system-feedback/            # Sistemin kullanıcıya verdiği AI destekli mesajlar
│   │   │   ├── system-feedback.module.ts
│   │   │   ├── system-feedback.controller.ts
│   │   │   ├── system-feedback.service.ts
│   │   │   └── ai-prompt.ts
│   │   ├── lesson/
│   │   │   ├── lesson.module.ts
│   │   │   ├── lesson.controller.ts
│   │   │   ├── lesson.service.ts
│   │   │   └── dto/
│   │   │       ├── create-lesson.dto.ts
│   │   │       ├── update-lesson.dto.ts
│   │   │       ├── add-exam.dto.ts
│   │   │       └── add-deadline.dto.ts
│   │   ├── prisma/                     # Prisma client sarmalayıcısı
│   │   │   ├── prisma.module.ts
│   │   │   └── prisma.service.ts
│   │   ├── debug/                      # Sadece MODE=test — saat override endpoint'i
│   │   │   └── debug.controller.ts
│   │   └── utils/
│   │       └── time.util.ts            # Zaman yönetimi (prod/test modu)
│   └── package.json
└── termprojectui/                       # Flutter uygulaması
```

---

## Veri Modelleri (Prisma Schema)

```prisma
model User {
  id                 Int              @id @default(autoincrement())
  email              String           @unique
  passwordHash       String
  preferredStudyTime StudyTime        @default(morning)
  studyStyle         StudyStyle       @default(normal)
  busySlots          UserBusySlot[]
  lessons            Lesson[]
  checklists         DailyChecklist[]
  weeklyFeedbacks    WeeklyFeedback[]
  scheduledBlocks    ScheduledBlock[]
  profile            StudentProfile?
}

model StudentProfile {
  id                 Int      @id @default(autoincrement())
  userId             Int      @unique
  user               User     @relation(fields: [userId], references: [id])
  updatedAt          DateTime @updatedAt

  // Rolling 7-day metrics
  completionRate7d   Float    @default(0)
  avgStress7d        Float    @default(3)
  avgFatigue7d       Float    @default(3)

  // Per-day-of-week completion rates (Mon=0..Sun=6), JSON string
  dowCompletionRates String   @default("[0,0,0,0,0,0,0]")

  // Tam tamamlanan session'lardaki ortalama blockCount
  sweetSpotBlocks    Float    @default(2)

  // Sınavı ≤7 gün kalan günlerdeki ortalama stres
  stressNearExam     Float    @default(3)

  // Son 14 günde en az 1 blok tamamlanan gün oranı
  consistencyScore   Float    @default(0)

  totalSubmissions   Int      @default(0)
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
  fatigueLevel Int     // 1-5
}

model Lesson {
  id                  Int              @id @default(autoincrement())
  userId              Int
  user                User             @relation(fields: [userId], references: [id])
  name                String
  difficulty          Int              // 1-5
  keyfiDelayCount     Int              @default(0)
  zorunluDelayCount   Int              @default(0)
  zorunluMissedBlocks Int              @default(0)
  needsMoreTime       Int              @default(0)  // -1 | 0 | +1
  exams               LessonExam[]
  deadlines           LessonDeadline[]
  scheduledBlocks     ScheduledBlock[]
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
  title        String?
}

model ScheduledBlock {
  id         Int      @id @default(autoincrement())
  userId     Int
  user       User     @relation(fields: [userId], references: [id])
  lessonId   Int
  lesson     Lesson   @relation(fields: [lessonId], references: [id])
  date       DateTime
  startTime  String   // "HH:MM"
  endTime    String   // "HH:MM"
  blockCount Int
  isReview   Boolean  @default(false)
  completed  Boolean  @default(false)
  weekStart  DateTime
}

model DailyChecklist {
  id           Int             @id @default(autoincrement())
  userId       Int
  user         User            @relation(fields: [userId], references: [id])
  date         DateTime
  stressLevel  Int             @default(3)
  fatigueLevel Int             @default(3)
  items        ChecklistItem[]
}

model ChecklistItem {
  id              Int            @id @default(autoincrement())
  checklistId     Int
  checklist       DailyChecklist @relation(fields: [checklistId], references: [id])
  lessonId        Int
  plannedBlocks   Int
  completedBlocks Int            @default(0)
  delayed         Boolean        @default(false)
}

model WeeklyFeedback {
  id               Int              @id @default(autoincrement())
  userId           Int
  user             User             @relation(fields: [userId], references: [id])
  weekStart        DateTime
  weekloadFeedback String           // "cok_yogundu" | "tam_uygundu" | "yetersizdi"
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

> Belirtilmedikçe tüm endpoint'ler `JwtAuthGuard` ile korunur (Authorization: Bearer <token>).

### Auth (korumasız)

| Method | Path             | Açıklama                                      |
|--------|------------------|-----------------------------------------------|
| POST   | /auth/register   | Yeni kullanıcı kaydı → `{ access_token }`     |
| POST   | /auth/login      | Giriş → `{ access_token }`                    |

### User

| Method | Path                    | Açıklama                                      |
|--------|-------------------------|-----------------------------------------------|
| GET    | /user/me                | Giriş yapan kullanıcının profilini getir      |
| POST   | /user/setup             | Kullanıcı tercihlerini kaydet (ilk kurulum)   |
| PUT    | /user/busy-slots        | BusySlot'ları tamamen güncelle                |
| GET    | /user/student-profile   | Dijital ikiz (StudentProfile) verisini getir  |

### Planner

| Method | Path                  | Açıklama                                           |
|--------|-----------------------|----------------------------------------------------|
| POST   | /planner/create       | Haftalık programı oluşturur (Pazar / ilk kurulum)  |
| POST   | /planner/recalculate  | BusySlot değişikliğinde yeniden hesapla (ADIM 9)   |
| GET    | /planner/week         | Haftanın bloklarını getir                          |

### Checklist

| Method | Path               | Açıklama                     |
|--------|--------------------|------------------------------|
| POST   | /checklist/submit  | Günlük checklist gönder      |
| GET    | /checklist/:date   | Tarihe göre checklist getir  |

### Feedback

| Method | Path               | Açıklama                                      |
|--------|--------------------|-----------------------------------------------|
| POST   | /feedback/weekly   | Kullanıcının haftalık geri bildirimini kaydet |
| GET    | /feedback/messages | Aktif uyarı ve öneri mesajlarını getir        |

### System Feedback

| Method | Path                       | Açıklama                             |
|--------|----------------------------|--------------------------------------|
| GET    | /system-feedback/message   | AI destekli haftalık mesajı getir    |

### Lesson

| Method | Path                         | Açıklama              |
|--------|------------------------------|-----------------------|
| GET    | /lesson                      | Tüm dersleri listele  |
| POST   | /lesson                      | Ders ekle             |
| PUT    | /lesson/:id                  | Ders güncelle         |
| DELETE | /lesson/:id                  | Ders sil              |
| POST   | /lesson/:id/exam             | Sınav tarihi ekle     |
| POST   | /lesson/:id/deadline         | Deadline / ödev ekle  |
| DELETE | /lesson/:id/deadline/:did    | Deadline sil          |

### Debug (korumasız — sadece MODE=test)

| Method | Path          | Açıklama                                                        |
|--------|---------------|-----------------------------------------------------------------|
| GET    | /debug/mode   | Aktif modu döndürür: `{ mode: "test"\|"prod", current: string }`|
| POST   | /debug/clock  | Backend saatini override et. Body: `{ datetime?: string }`. `datetime` yoksa reset. |

---

## Zaman Yönetimi (`utils/time.util.ts`)

Tüm modüller `new Date()` yerine `getCurrentTime()` kullanır.

```typescript
// MODE=prod → gerçek sistem saati
// MODE=test → önce runtime override (POST /debug/clock), sonra TEST_CURRENT_TIME env, sonra gerçek saat
export function getCurrentTime(): Date { ... }
export function setTestTimeOverride(dt: Date | null): void { ... }
```

`.env` dosyasında:
- `MODE=prod` → gerçek saat kullanılır, `/debug/clock` istekleri yok sayılır
- `MODE=test` → `POST /debug/clock` ile saat override edilebilir

---

## Dijital İkiz — StudentProfile

`StudentProfile`, her `POST /checklist/submit` sonrasında `UserService.updateStudentProfile()` ile güncellenir.

| Alan                | Hesaplama                                                        |
|---------------------|------------------------------------------------------------------|
| `completionRate7d`  | Son 7 günde tamamlanan / planlanan blok oranı                    |
| `avgStress7d`       | Son 7 günün stressLevel ortalaması                               |
| `avgFatigue7d`      | Son 7 günün fatigueLevel ortalaması                              |
| `dowCompletionRates`| Haftanın her günü için tamamlama oranı (Mon=0..Sun=6, JSON)      |
| `sweetSpotBlocks`   | Tam tamamlanan session'lardaki ortalama blockCount               |
| `stressNearExam`    | Sınavı ≤7 gün kalan günlerdeki ortalama stres                    |
| `consistencyScore`  | Son 14 günde en az 1 blok tamamlanan gün oranı (activeDays / 14) |
| `totalSubmissions`  | Toplam checklist gönderim sayısı                                 |

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
── GÜN SINIFI ────────────────────────────────────────────────────────
  avgFatigue ≤ 2  →  rahat   (yoğunluk 1)
  avgFatigue = 3  →  normal  (yoğunluk 2)
  avgFatigue ≥ 4  →  yorucu  (yoğunluk 3)

── DERS SINIFI ───────────────────────────────────────────────────────
  difficulty ≥ 4  VEYA  öncelik = KRİTİK  →  AGIR   (tercih: rahat)
  difficulty ≤ 2  VE   öncelik = DÜŞÜK    →  HAFIF  (tercih: yorucu)
  diğer                                   →  ORTA   (tercih: normal)

── TERCIH SIRASI ─────────────────────────────────────────────────────
  AGIR   → rahat  → normal  → yorucu
  ORTA   → normal → rahat   → yorucu
  HAFIF  → yorucu → normal  → rahat

── DERS SINIFI OTURUM SINIRLARI (LESSON_CLASS_CAP) ──────────────────
  AGIR  → max 1 blok/oturum
  ORTA  → max 2 blok/oturum
  HAFIF → sınır yok (day.maxBlocksPerSession'a bırakılır)

  toPlace = min(kalan, dayBlocksRemaining, day.maxBlocksPerSession, LESSON_CLASS_CAP)

── ROUND-ROBIN YERLEŞTİRME ──────────────────────────────────────────
freeWindows = 08:00–00:00 − busySlotlar (merge edilmiş)

WHILE (ilerleme var):
  FOR her ders (öncelik sırasına göre):
    kalan = 0 → atla

    FOR her gün in dayOrder (tercih sırasına göre):
      dayBlocksRemaining[gün] = 0 → atla
      placedDays içinde bu gün zaten var → atla   (günde 1 oturum)

      slotlu mod aktifse ve 3 üst üste gün oluşuyorsa → atla

      AGIR ders: bitişik güne (dayIdx-1 veya dayIdx+1) zaten yerleşti → atla
        (slottedMode olmadan da AGIR dersler art arda yerleştirilmez)

      toPlace = calcToPlace(kalan, dayBlocksRemaining, maxBlocksPerSession, LESSON_CLASS_CAP)

      Candidate slot listesi üret (freeWindows içinde 30 dk adımlarla kaydır)
      Her candidate için scoreCandidate() ile puan hesapla
      En yüksek puanlı slotu seç ve yerleştir

      Başarılıysa:
        → dayBlocksRemaining[gün] -= toPlace
        → kalan -= toPlace
        → placedDays.add(gün)
        → ilerleme = true
        → gün yoğunluğu > ders tercih yoğunluğu ise: programZorlastu = true
        → yerleştirilen slot preferredRange içindeyse: daySessionsInPreferred[gün]++
        → sonraki derse geç (break)

WHILE sonu → kalan > 0 olan dersler → notFitted kaydına ekle

── SLOT PUANLAMA (scoreCandidate) ────────────────────────────────────
  Tercih saat örtüşmesi:
    tam örtüşme (≥1.0)      →  +30
    kısmi örtüşme (≥0.5)   →  +15
    az örtüşme  (>0)        →  +5

  AGIR + tam örtüşme        →  +20 (ek bonus)
  AGIR + örtüşme yok        →  −15
  HAFIF + örtüşme yok       →  +10 (zor derslere peak saat bırakılır)

  AGIR + gece (≥21:00)      →  −35
  AGIR + sabah (08:00–12:00)→  +10 (peak hours)
  HAFIF + gece (≥21:00)     →  +10

  AGIR + rahat gün          →  +15
  AGIR + yorucu gün         →  −20

  Aynı günde preferred'da zaten 1 oturum var  →  −5  (2. oturum)
  Aynı günde preferred'da zaten ≥2 oturum var →  −20 (3.+ oturum)

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

### StudentProfile Güncellemesi

```
submit tamamlandıktan sonra UserService.updateStudentProfile(userId) çağrılır.
Bu çağrı son 7–14 günün verilerini hesaplayıp StudentProfile'i upsert eder.
```

---

## Kullanıcı Feedback

### `POST /feedback/weekly` — Haftalık Geri Bildirim

```
WeeklyFeedback.weekloadFeedback:
  "cok_yogundu" | "tam_uygundu" | "yetersizdi"
  → ADIM 1'de nextWeekMultiplier belirlenir

LessonFeedback.needsMoreTime:
  -1 | 0 | +1  (ders bazında)
  → ADIM 4'te effectiveWeight hesabında kullanılır
```

### `GET /feedback/messages` — Aktif Uyarı Mesajları

```
Sistemin ürettiği aktif uyarı ve öneri mesajlarını listeler.
(FeedbackEvent'ler bu endpoint üzerinden okunur)
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

Kullanıcı takibi (StudentProfile):
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

| Parametre             | Kaynak               | Etkili Olduğu Adım(lar)                         |
|-----------------------|----------------------|-------------------------------------------------|
| weekCompletionRate    | DailyChecklist       | ADIM 0 — tükenmişlik sinyali                    |
| weekloadFeedback      | WeeklyFeedback       | ADIM 1 — blok çarpanı                           |
| effectiveBlocks       | ADIM 2 çıktısı       | ADIM 3,4,5 — tüm dağıtımın temeli               |
| examDate + difficulty | LessonExam, Lesson   | ADIM 3 — tekrar bloğu · ADIM 7.5 — yerleştirme |
| needsMoreTime         | WeeklyFeedback       | ADIM 4 — weight (delay=0 ise)                   |
| fatigueLevel          | UserBusySlot         | ADIM 5 — gün ağırlığı                           |
| preferredStudyTime    | User                 | ADIM 7.5, 8 — peak slot seçimi                  |
| keyfiDelayCount       | Lesson               | ADIM 4 weight + ADIM 6 öncelik + slotlu mod     |
| zorunluDelayCount     | Lesson               | ADIM 4 weight + ADIM 6 öncelik + telafi bloğu   |
| U (sınava kalan gün)  | calculateU(lesson)   | ADIM 6 — öncelik kademesi                       |
| difficulty            | Lesson               | ADIM 6,7 — öncelik + bilişsel yük               |
| studyStyle            | User                 | ADIM 5 — session yapısı                         |

---

## Önemli Kurallar (Kod Yazarken Kesinlikle Uyulacak)

1. **Tüm süre matematiği blok cinsindendir.** Ondalıklı blok yoktur; `Math.floor` veya `largestRemainder` kullanılır.
2. **KRİTİK öncelik diğer tüm kurallara karşı kazanır.**
3. **Her modül kendi klasöründe bağımsızdır:** `auth`, `user`, `planner`, `checklist`, `feedback`, `system-feedback`, `lesson`, `prisma`, `debug`, `utils`.
4. **Algoritma adımları `planner/algorithm/` altında ayrı dosyalardadır** (step0 … step9).
5. **Her service'teki fonksiyona açıklama satırı yazılır.**
6. **Tüm zaman operasyonları `getCurrentTime()` ile yapılır**, `new Date()` doğrudan kullanılmaz.
7. **`JwtAuthGuard` tüm endpoint'lere uygulanır** — sadece `POST /auth/register` ve `POST /auth/login` korumasızdır. `/debug/*` endpoint'leri korumasız ama `MODE=test` kontrolü yapar.
8. **`POST /debug/clock`** sadece `MODE=test` ortamında etki eder; `MODE=prod` ise isteği sessizce yok sayar.
