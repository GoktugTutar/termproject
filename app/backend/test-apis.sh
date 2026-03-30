#!/bin/bash

BASE_URL="http://localhost:3000"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0

EMAIL="testuser_script@test.com"
PASSWORD="test123456"

check() {
  local name="$1"
  local status="$2"
  local expected="$3"
  local body="$4"

  if [ "$status" -eq "$expected" ]; then
    echo -e "${GREEN}✔ ONAYLANDI${NC} — $name (HTTP $status)"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}✘ BAŞARISIZ${NC} — $name (HTTP $status, beklenen $expected)"
    echo -e "   ${YELLOW}Cevap:${NC} $body"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "=============================="
echo "  TEMİZLİK AŞAMASI"
echo "=============================="
echo ""

# Mevcut test kullanıcısı varsa login ol ve sil
CLEANUP_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
CLEANUP_BODY=$(echo "$CLEANUP_RESPONSE" | sed '$d')
CLEANUP_STATUS=$(echo "$CLEANUP_RESPONSE" | tail -n 1)

if [ "$CLEANUP_STATUS" -eq 200 ]; then
  CLEANUP_TOKEN=$(echo "$CLEANUP_BODY" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
  if [ -z "$CLEANUP_TOKEN" ]; then
    CLEANUP_TOKEN=$(echo "$CLEANUP_BODY" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
  fi

  if [ -n "$CLEANUP_TOKEN" ]; then
    DELETE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/person/delete" \
      -H "Authorization: Bearer $CLEANUP_TOKEN")
    if [ "$DELETE_STATUS" -eq 204 ]; then
      echo -e "${YELLOW}► Mevcut test kullanıcısı silindi.${NC}"
    else
      echo -e "${RED}► Kullanıcı silinemedi (HTTP $DELETE_STATUS).${NC}"
    fi
  fi
else
  echo -e "${YELLOW}► Mevcut kullanıcı bulunamadı, temizlik atlanıyor.${NC}"
fi

echo ""
echo "=============================="
echo "  API TEST BAŞLIYOR"
echo "=============================="
echo ""

# ── 1. REGISTER ──────────────────────────────────────────────────────────────
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
BODY=$(echo "$RESPONSE" | sed '$d')
STATUS=$(echo "$RESPONSE" | tail -n 1)
check "POST /auth/register" "$STATUS" 201 "$BODY"

# ── 2. LOGIN ─────────────────────────────────────────────────────────────────
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
BODY=$(echo "$RESPONSE" | sed '$d')
STATUS=$(echo "$RESPONSE" | tail -n 1)
check "POST /auth/login" "$STATUS" 200 "$BODY"

TOKEN=$(echo "$BODY" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
  TOKEN=$(echo "$BODY" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
fi

if [ -z "$TOKEN" ]; then
  echo -e "${RED}Token alınamadı! Korumalı endpoint testleri atlanıyor.${NC}"
  echo ""
  echo "=============================="
  echo "  SONUÇ: $PASS onaylandı / $FAIL başarısız"
  echo "=============================="
  exit 1
fi

echo -e "   ${YELLOW}Token alındı:${NC} ${TOKEN:0:40}..."
echo ""

AUTH="Authorization: Bearer $TOKEN"

# ── 3. UPDATE PERSON ─────────────────────────────────────────────────────────
RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/person/update" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d '{"name":"Test User","gpa":3.5,"semester":4,"stressLevel":3}')
BODY=$(echo "$RESPONSE" | sed '$d')
STATUS=$(echo "$RESPONSE" | tail -n 1)
check "PUT /person/update" "$STATUS" 200 "$BODY"

# ── 4. REGISTER LESSONS ───────────────────────────────────────────────────────
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/lesson/register" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d '[
    {
      "name": "Matematik",
      "credit": 4,
      "difficulty": 3,
      "semester": 4,
      "vizeDate": "2026-04-15T10:00:00.000Z",
      "finalDate": "2026-06-10T10:00:00.000Z",
      "homeworkDeadlines": ["2026-04-05T23:59:00.000Z"]
    },
    {
      "name": "Fizik",
      "credit": 3,
      "difficulty": 4,
      "semester": 4,
      "vizeDate": "2026-04-20T10:00:00.000Z",
      "finalDate": "2026-06-15T10:00:00.000Z"
    }
  ]')
BODY=$(echo "$RESPONSE" | sed '$d')
STATUS=$(echo "$RESPONSE" | tail -n 1)
check "POST /lesson/register" "$STATUS" 201 "$BODY"

# ── 5. UPDATE LESSON ─────────────────────────────────────────────────────────
RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/lesson/update/Matematik" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d '{"difficulty": 4}')
BODY=$(echo "$RESPONSE" | sed '$d')
STATUS=$(echo "$RESPONSE" | tail -n 1)
check "PUT /lesson/update/:name" "$STATUS" 200 "$BODY"

# ── 6. CREATE PLANNER (önce planner, sonra checklist) ────────────────────────
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/planner/create" \
  -H "Content-Type: application/json" \
  -H "$AUTH")
BODY=$(echo "$RESPONSE" | sed '$d')
STATUS=$(echo "$RESPONSE" | tail -n 1)
check "POST /planner/create" "$STATUS" 201 "$BODY"

# ── 7. CREATE CHECKLIST ───────────────────────────────────────────────────────
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/checklist/create" \
  -H "Content-Type: application/json" \
  -H "$AUTH")
BODY=$(echo "$RESPONSE" | sed '$d')
STATUS=$(echo "$RESPONSE" | tail -n 1)
check "POST /checklist/create" "$STATUS" 201 "$BODY"

# ── 8. GET CHECKLIST ──────────────────────────────────────────────────────────
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/checklist/get" \
  -H "$AUTH")
BODY=$(echo "$RESPONSE" | sed '$d')
STATUS=$(echo "$RESPONSE" | tail -n 1)
check "GET /checklist/get" "$STATUS" 200 "$BODY"

# Checklist'ten lesson ID'lerini çek
LESSON_ID=$(echo "$BODY" | grep -o '"lessonId":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -z "$LESSON_ID" ]; then
  LESSON_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
fi

# ── 9. SUBMIT CHECKLIST ───────────────────────────────────────────────────────
if [ -n "$LESSON_ID" ]; then
  SUBMIT_BODY="{\"lessons\":[{\"lessonId\":\"$LESSON_ID\",\"hoursCompleted\":2}]}"
else
  SUBMIT_BODY='{"lessons":[]}'
fi

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/checklist/submit" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d "$SUBMIT_BODY")
BODY=$(echo "$RESPONSE" | sed '$d')
STATUS=$(echo "$RESPONSE" | tail -n 1)
check "POST /checklist/submit" "$STATUS" 200 "$BODY"

# ── 10. GET SCHEDULE ──────────────────────────────────────────────────────────
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/planner/schedule" \
  -H "$AUTH")
BODY=$(echo "$RESPONSE" | sed '$d')
STATUS=$(echo "$RESPONSE" | tail -n 1)
check "GET /planner/schedule" "$STATUS" 200 "$BODY"

# ── 11. DELETE USER ───────────────────────────────────────────────────────────
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/person/delete" \
  -H "$AUTH")
check "DELETE /person/delete" "$RESPONSE" 204 ""

# ── SONUÇ ─────────────────────────────────────────────────────────────────────
echo ""
echo "=============================="
TOTAL=$((PASS + FAIL))
echo "  SONUÇ: $PASS/$TOTAL onaylandı"
if [ $FAIL -gt 0 ]; then
  echo -e "  ${RED}$FAIL endpoint başarısız${NC}"
else
  echo -e "  ${GREEN}Tüm endpointler onaylandı!${NC}"
fi
echo "=============================="
echo ""
