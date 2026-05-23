# ADIM 8 — Ders Yerleştirme: Detaylı Açıklama ve Örnek

## Genel Bakış

ADIM 8, her dersi hafta içindeki uygun zaman dilimlerine yerleştiren ana algoritma adımıdır.
Giriş olarak şunları alır:
- Her dersin kaç blok yerleştirilmesi gerektiği (`lessonAllocations`)
- Her günün kapasitesi ve yorgunluk bilgisi (`dayConfigs`, ADIM 5'ten)
- Her günün fiziksel boş zaman dilimleri (`freeWindows`)
- Kullanıcının tercih ettiği çalışma saati (`preferredStudyTime`)

Çıkış olarak şunları verir:
- Yerleştirilen blokların listesi (`placed`)
- Programın yoğunluk puanı (`programScore`, `programLevel`)
- Zorla yerleştirilen blok sayısı (`forcedBlocks`)
- Hiç yerleştirilemeyen ders id'leri (`unplacedLessonIds`)

---

## Temel Kavramlar

### Gün Sınıfı

Her günün `avgFatigue` değerine göre belirlenir:

```
avgFatigue ≤ 2  →  rahat   (az meşgul gün)
avgFatigue = 3  →  normal
avgFatigue ≥ 4  →  yorucu  (çok meşgul gün)
```

`avgFatigue`, o günün busy slot'larının `fatigueLevel` ortalamasıdır.
Busy slot yoksa `avgFatigue = 1` → gün sınıfı `rahat`.

### Ders Sınıfı

Her dersin `difficulty` ve `priority` değerine göre belirlenir:

```
difficulty ≥ 4  VEYA  priority = "KRITIK"  →  AGIR
difficulty ≤ 2  VE    priority = "DUSUK"   →  HAFIF
diğer                                      →  ORTA
```

### Gün Tercihi

Her ders sınıfı belirli gün sınıflarını tercih eder:

```
AGIR   →  rahat → normal → yorucu   (zor ders, rahat günde daha iyi çalışılır)
ORTA   →  normal → rahat → yorucu
HAFIF  →  yorucu → normal → rahat   (kolay ders, meşgul güne bırakılabilir)
```

### Slot Puanlama (scoreCandidate)

Bir candidate slot'un puanı 4 faktörden hesaplanır:

#### Faktör 1 — Tercih saatiyle örtüşme
Kullanıcının `preferredStudyTime` aralığıyla örtüşme oranı:
```
tam örtüşme (≥%100)   →  +30
kısmi örtüşme (≥%50)  →  +15
az örtüşme (>0)       →  +5
örtüşme yok           →  0
```

Zaman dilimleri:
- morning:   08:00–11:00
- afternoon: 12:00–15:00
- evening:   18:00–21:00
- night:     21:00–24:00

#### Faktör 2 — Ders sınıfı bonusu
```
AGIR + tam örtüşme   →  +20  (bonus: zor ders peak saatte)
AGIR + örtüşme yok   →  −15  (ceza: zor ders kötü saatte)
HAFIF + örtüşme yok  →  +5   (kolay dersin peak saate ihtiyacı yok)
```

#### Faktör 3 — Pencere uzaklığı (örtüşme yoksa)
4 pencere var (morning, afternoon, evening, night). Slot kaç pencere uzakta?
```
1 pencere uzakta  →  −5
2 pencere uzakta  →  −15
3 pencere uzakta  →  −25
```

#### Faktör 4 — Gün sınıfı × ders sınıfı
```
AGIR + rahat gün   →  +15  (en iyi kombinasyon)
AGIR + yorucu gün  →  −20  (en kötü kombinasyon)
```

---

## 4 Dalgalı Yerleştirme Sistemi

Sistem 4 dalga sırasıyla çalışır. Her dalga round-robin yapar:
bir ders için 1 session koyar, sıradaki derse geçer, döngü tamamlanana kadar devam eder.

Dalgalar arasındaki fark kısıtların gevşetilmesidir:

| Kısıt | Dalga 1 | Dalga 2 | Dalga 3 | Dalga 4 |
|---|:---:|:---:|:---:|:---:|
| `dayBlocksRemaining` kontrolü | ✓ | ✓ | ✓ | — |
| `placedDays` (günde 1 oturum) | ✓ | ✓ | ✓ | — |
| `sessionsUsed ≥ maxSessions` | ✓ | ✓ | ✓ (×2) | — |
| AGIR art arda gün yasağı | ✓ | — | — | — |
| slottedMode 3'lü zincir | ✓ | — | — | — |
| Gün sırası | tercih | tercih | kronolojik | kronolojik |
| Fiziksel boş slot | ✓ | ✓ | ✓ | ✓ |

Her dalga yalnızca önceki dalgada kalan (`remaining > 0`) dersler üzerinde çalışır.

### Dalga Cezaları (programScore hesabı)

```
Dalga 1  →  ceza: 0   (ideal yerleştirme)
Dalga 2  →  ceza: 1   (art arda kısıt gevşetildi)
Dalga 3  →  ceza: 2   (session limiti aşıldı)
Dalga 4  →  ceza: 4   (her şey zorlandı)

programScore = Σ(WAVE_PENALTY × blockCount) / (totalBlocks × 4)

programLevel:
  < 0.15  →  "normal"
  < 0.45  →  "busy"
  ≥ 0.45  →  "very_busy"
```

---

## Kapsamlı Örnek

### Senaryo

**Kullanıcı:**
- `preferredStudyTime`: morning (08:00–11:00)
- `studyStyle`: normal → `maxSessions = 2`, `maxBlocksPerSession = 3`

**Dersler (ADIM 8'e girecek allocations):**

| Ders | difficulty | priority | Sınıf | Blok |
|---|---|---|---|---|
| Matematik | 5 | YUKSEK | AGIR | 4 |
| Tarih | 3 | NORMAL | ORTA | 3 |
| Beden | 1 | DUSUK | HAFIF | 2 |

**Hafta (3 gün — basit örnek):**

| Gün | avgFatigue | Sınıf | maxBlocks | maxSessions | freeWindows |
|---|---|---|---|---|---|
| Pazartesi | 1 (boş gün) | rahat | 6 | 2 | 08:00–24:00 |
| Salı | 4 (yoğun gün) | yorucu | 6 | 2 | 08:00–10:00, 14:00–24:00 |
| Çarşamba | 3 (orta gün) | normal | 6 | 2 | 08:00–24:00 |

**Başlangıç durumu:**
```
remaining:            { Matematik: 4, Tarih: 3, Beden: 2 }
dayBlocksRemaining:   { Pzt: 6, Sal: 6, Çar: 6 }
sessionsUsed:         { Pzt: 0, Sal: 0, Çar: 0 }
placedDays:           { Matematik: {}, Tarih: {}, Beden: {} }
```

---

### DALGA 1 — Tüm kısıtlar aktif

**Round-robin Tur 1:**

#### Matematik (AGIR, 4 blok kaldı)
Gün tercihi: rahat → normal → yorucu
- Pazartesi (rahat) → tüm kontroller geçer
- `toPlace = min(4, 6, 3) = 3` blok
- Candidate slot'lar üret (08:00'den başlayarak 30 dk adım):
  - 08:00–09:30: morning penceresi, tam örtüşme → +30, AGIR+tam → +20, AGIR+rahat gün → +15 = **+65**
  - 08:30–10:00: morning, tam örtüşme → +30, +20, +15 = **+65** (ilk puanlı seçilir)
  - 09:30–11:00: morning, tam örtüşme → **+65**
  - 13:00–14:30: afternoon, örtüşme yok → 0, AGIR+örtüşmesiz → −15, 1 pencere uzak → −5, AGIR+rahat gün → +15 = **−5**
  - ...
- **→ 08:00–09:30 seçildi** (puan: +65)
- `dayBlocksRemaining[Pzt] = 3`, `sessionsUsed[Pzt] = 1`, `placedDays[Matematik] = {Pzt}`
- `remaining[Matematik] = 1`

#### Tarih (ORTA, 3 blok kaldı)
Gün tercihi: normal → rahat → yorucu
- Çarşamba (normal) → tüm kontroller geçer
- `toPlace = min(3, 6, 3) = 3` blok
- 08:00–09:30: morning, tam örtüşme → +30 = **+30** (ORTA ders bonus/ceza yok)
- **→ 08:00–09:30 seçildi** (puan: +30)
- `dayBlocksRemaining[Çar] = 3`, `sessionsUsed[Çar] = 1`, `placedDays[Tarih] = {Çar}`
- `remaining[Tarih] = 0` ✓ Tarih bitti.

#### Beden (HAFIF, 2 blok kaldı)
Gün tercihi: yorucu → normal → rahat
- Salı (yorucu) → tüm kontroller geçer
- `toPlace = min(2, 6, 3) = 2` blok
- 08:00–09:00: morning, tam örtüşme → +30, HAFIF+örtüşme yok değil (var) → **+30**
- 14:00–15:00: afternoon, kısmi örtüşme → +15, HAFIF+örtüşmesiz değil → **+15**
- **→ 08:00–09:00 seçildi** (puan: +30)
- `dayBlocksRemaining[Sal] = 4`, `sessionsUsed[Sal] = 1`, `placedDays[Beden] = {Sal}`
- `remaining[Beden] = 0` ✓ Beden bitti.

**Round-robin Tur 2:**

#### Matematik (AGIR, 1 blok kaldı)
Gün tercihi: rahat → normal → yorucu
- Pazartesi → `placedDays[Matematik]` zaten Pzt var → **atla**
- Çarşamba (normal) → tüm kontroller geçer, `dayBlocksRemaining[Çar] = 3 > 0`
- `toPlace = min(1, 3, 3) = 1` blok
- 09:30–10:00: morning, tam örtüşme → +30, AGIR+tam → +20, AGIR+normal gün (ne bonus ne ceza) → **+50**
- **→ 09:30–10:00 seçildi** (puan: +50)
- `dayBlocksRemaining[Çar] = 2`, `sessionsUsed[Çar] = 2`, `placedDays[Matematik] = {Pzt, Çar}`
- `remaining[Matematik] = 0` ✓ Matematik bitti.

**Dalga 1 sonu:** Tüm dersler sığdı. Dalga 2-3-4 çalışmaz.

---

### Yerleşim Sonucu

| Ders | Gün | Saat | Blok | Dalga |
|---|---|---|---|---|
| Matematik | Pazartesi | 08:00–09:30 | 3 | 1 |
| Tarih | Çarşamba | 08:00–09:30 | 3 | 1 |
| Beden | Salı | 08:00–09:00 | 2 | 1 |
| Matematik | Çarşamba | 09:30–10:00 | 1 | 1 |

---

### Program Puanı

```
totalBlocks    = 4 + 3 + 2 = 9
violationScore = 0  (hepsi dalga 1)

programScore   = 0 / (9 × 4) = 0.0
programLevel   = "normal"
forcedBlocks   = 0
unplacedLessonIds = []
```

---

## Zorlanmış Senaryo Örneği

Aynı dersler, ama kullanıcı haftanın 3 gününü de 08:00–24:00 meşgul olarak işaretledi.
`freeWindows` her gün için boş. Hiçbir dalga yerleştiremez:

```
Dalga 1: freeWindows boş → placeIntoWindows false döner → hiç yerleştirme yok
Dalga 2: aynı
Dalga 3: aynı
Dalga 4: aynı

unplacedLessonIds = [Matematik.id, Tarih.id, Beden.id]
programLevel      = "normal"  (blok yoksa violationScore=0)
```

UI bu durumda kullanıcıya: "3 ders bu hafta programa sığdırılamadı" bildirimini gösterir.

---

## Günde 1 Oturum Kuralı ve Dalga 2

Şimdi Matematik'in `slottedMode = true` (keyfiDelayCount > 0) olduğunu varsayalım
ve Pazartesi–Salı–Çarşamba arka arkaya 3 gün yerleştirmeye çalışıldığını:

```
Dalga 1, Tur 1:  Matematik → Pazartesi ✓ (placedDays = {Pzt})
Dalga 1, Tur 2:  Matematik → Salı
  → creates3Consecutive(Sal, {Pzt}) kontrolü:
    Pzt zaten var, Salı+Pazartesi = 2 ardışık → henüz 3 değil → ✓ geçer
Dalga 1, Tur 3:  Matematik → Çarşamba
  → creates3Consecutive(Çar, {Pzt, Sal}):
    Sal var + Pzt var = 3 ardışık olur → ATLA

→ Çarşamba'ya dalga 1'de giremez, kalan = 1 blok
```

**Dalga 2:** `allowConsecutive = true` → 3'lü zincir kontrolü kaldırıldı.
- Matematik → Çarşamba → kontrol yok → yerleşir.

Bu blok `waveUsed = 2` → `violationScore += 1`.

---

## Freewindow Bölünmesi (splitWindow)

Bir blok yerleştirildikten sonra ilgili freeWindow ikiye bölünür:

```
Başlangıç freeWindow: 08:00–12:00 (480–720 dk)
Yerleştirilen blok:   08:00–09:30 (480–570 dk)

Sonuç:
  [570–720]  yani  09:30–12:00
```

Sonraki candidate üretiminde yalnızca kalan alanlar kullanılır.
Bu sayede aynı zaman dilimine iki blok bindirmez.
