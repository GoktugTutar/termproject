#!/usr/bin/env bash

set -u
set -o pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
TEST_PASSWORD="${TEST_PASSWORD:-Test123456}"
RUN_ID="$(date +%s)-$$"
TEST_EMAIL="api-test-${RUN_ID}@example.com"
TEST_NAME="Smoke Test User"
UPDATED_NAME="Smoke Test User Updated"
LESSON_NAME="SmokeLessonA"
UPDATED_LESSON_NAME="SmokeLessonAUpdated"

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

TOKEN=""
LESSON_ID=""
CHECKLIST_LESSON_ID=""
CHECKLIST_CREATED=0
CHECKLIST_SKIP_REASON=""
USER_DELETED=0

RESPONSE_STATUS=""
RESPONSE_BODY=""

print_line() {
  printf '%s\n' "$1"
}

compact_body() {
  printf '%s' "${1:-}" | tr '\n' ' ' | sed 's/[[:space:]]\+/ /g' | cut -c1-220
}

record_pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  print_line "PASS $1 (HTTP $2)"
}

record_fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  print_line "FAIL $1 (HTTP $2)"
  if [ -n "${3:-}" ]; then
    print_line "  body: $(compact_body "$3")"
  fi
}

record_skip() {
  SKIP_COUNT=$((SKIP_COUNT + 1))
  print_line "SKIP $1 - $2"
}

json_get_string() {
  printf '%s' "${1:-}" | tr -d '\n' | grep -o "\"$2\":\"[^\"]*\"" | head -n1 | cut -d'"' -f4
}

perform_request() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  local token="${4:-}"
  local tmp_body
  local tmp_err
  local -a cmd

  tmp_body="$(mktemp)"
  tmp_err="$(mktemp)"
  cmd=(curl -sS --connect-timeout 5 -o "$tmp_body" -w "%{http_code}" -X "$method" "$BASE_URL$path")

  if [ -n "$body" ]; then
    cmd+=(-H "Content-Type: application/json" --data "$body")
  fi

  if [ -n "$token" ]; then
    cmd+=(-H "Authorization: Bearer $token")
  fi

  RESPONSE_STATUS="$("${cmd[@]}" 2>"$tmp_err" || true)"
  RESPONSE_BODY="$(cat "$tmp_body" 2>/dev/null)"

  if [ "${RESPONSE_STATUS:-000}" = "000" ] && [ -s "$tmp_err" ]; then
    RESPONSE_BODY="$(cat "$tmp_err")"
  fi

  rm -f "$tmp_body" "$tmp_err"
}

cleanup() {
  if [ "$USER_DELETED" -eq 1 ] || [ -z "$TOKEN" ]; then
    return
  fi

  perform_request "DELETE" "/person/delete" "" "$TOKEN"
  if [ "$RESPONSE_STATUS" = "204" ]; then
    USER_DELETED=1
    print_line "CLEANUP DELETE /person/delete (HTTP 204)"
  else
    print_line "CLEANUP FAILED DELETE /person/delete (HTTP ${RESPONSE_STATUS:-000})"
  fi
}

trap cleanup EXIT

print_summary() {
  local total
  total=$((PASS_COUNT + FAIL_COUNT + SKIP_COUNT))
  print_line ""
  print_line "Summary"
  print_line "PASS: $PASS_COUNT"
  print_line "FAIL: $FAIL_COUNT"
  print_line "SKIP: $SKIP_COUNT"
  print_line "TOTAL: $total"
}

require_token_or_skip() {
  if [ -n "$TOKEN" ]; then
    return 0
  fi

  record_skip "$1" "no auth token available from register/login"
  return 1
}

CURRENT_DAY_KEY="$(LC_ALL=C date '+%A' | tr '[:upper:]' '[:lower:]')"
CURRENT_HOUR="$(date '+%H' | sed 's/^0*//')"
CURRENT_HOUR="${CURRENT_HOUR:-0}"

print_line "Smoke test starting against $BASE_URL"
print_line "Test user: $TEST_EMAIL"
print_line ""

REACHABLE_STATUS="$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$BASE_URL/auth/login" || true)"
if [ "$REACHABLE_STATUS" = "000" ]; then
  record_fail "PRECHECK $BASE_URL" "000" "Backend is not reachable. Start the API server first."
  print_summary
  exit 1
fi

REGISTER_BODY="$(printf '{"email":"%s","password":"%s","name":"%s"}' "$TEST_EMAIL" "$TEST_PASSWORD" "$TEST_NAME")"
perform_request "POST" "/auth/register" "$REGISTER_BODY"
if [ "$RESPONSE_STATUS" = "201" ]; then
  TOKEN="$(json_get_string "$RESPONSE_BODY" "access_token")"
  if [ -n "$TOKEN" ]; then
    record_pass "POST /auth/register" "$RESPONSE_STATUS"
  else
    record_fail "POST /auth/register" "$RESPONSE_STATUS" "access_token not found in response"
  fi
else
  record_fail "POST /auth/register" "$RESPONSE_STATUS" "$RESPONSE_BODY"
fi

LOGIN_BODY="$(printf '{"email":"%s","password":"%s"}' "$TEST_EMAIL" "$TEST_PASSWORD")"
perform_request "POST" "/auth/login" "$LOGIN_BODY"
if [ "$RESPONSE_STATUS" = "200" ]; then
  LOGIN_TOKEN="$(json_get_string "$RESPONSE_BODY" "access_token")"
  if [ -n "$LOGIN_TOKEN" ]; then
    TOKEN="$LOGIN_TOKEN"
    record_pass "POST /auth/login" "$RESPONSE_STATUS"
  else
    record_fail "POST /auth/login" "$RESPONSE_STATUS" "access_token not found in response"
  fi
else
  record_fail "POST /auth/login" "$RESPONSE_STATUS" "$RESPONSE_BODY"
fi

if require_token_or_skip "GET /person/me"; then
  perform_request "GET" "/person/me" "" "$TOKEN"
  if [ "$RESPONSE_STATUS" = "200" ] && printf '%s' "$RESPONSE_BODY" | grep -q "\"email\":\"$TEST_EMAIL\""; then
    record_pass "GET /person/me" "$RESPONSE_STATUS"
  else
    record_fail "GET /person/me" "$RESPONSE_STATUS" "$RESPONSE_BODY"
  fi
fi

if require_token_or_skip "PUT /person/update"; then
  UPDATE_PROFILE_BODY="$(printf '{"name":"%s","gpa":3.4,"semester":5,"stressLevel":4,"busyTimes":{"monday":{"9-11":"class"}}}' "$UPDATED_NAME")"
  perform_request "PUT" "/person/update" "$UPDATE_PROFILE_BODY" "$TOKEN"
  if [ "$RESPONSE_STATUS" = "200" ] \
    && printf '%s' "$RESPONSE_BODY" | grep -q "\"name\":\"$UPDATED_NAME\"" \
    && printf '%s' "$RESPONSE_BODY" | grep -q '"stressLevel":4'; then
    record_pass "PUT /person/update" "$RESPONSE_STATUS"
  else
    record_fail "PUT /person/update" "$RESPONSE_STATUS" "$RESPONSE_BODY"
  fi
fi

if require_token_or_skip "GET /person/me (verify)"; then
  perform_request "GET" "/person/me" "" "$TOKEN"
  if [ "$RESPONSE_STATUS" = "200" ] \
    && printf '%s' "$RESPONSE_BODY" | grep -q "\"name\":\"$UPDATED_NAME\"" \
    && printf '%s' "$RESPONSE_BODY" | grep -q '"semester":5'; then
    record_pass "GET /person/me (verify)" "$RESPONSE_STATUS"
  else
    record_fail "GET /person/me (verify)" "$RESPONSE_STATUS" "$RESPONSE_BODY"
  fi
fi

if require_token_or_skip "POST /lesson/register"; then
  LESSON_REGISTER_BODY='[
    {
      "name": "SmokeLessonA",
      "credit": 4,
      "difficulty": 4,
      "semester": 5,
      "remainingTopicsCount": 8,
      "vizeDate": "2099-12-20T10:00:00.000Z",
      "finalDate": "2100-01-20T10:00:00.000Z"
    },
    {
      "name": "SmokeLessonB",
      "credit": 3,
      "difficulty": 3,
      "semester": 5,
      "remainingTopicsCount": 5,
      "vizeDate": "2099-12-22T10:00:00.000Z"
    },
    {
      "name": "SmokeLessonC",
      "credit": 2,
      "difficulty": 2,
      "semester": 5,
      "remainingTopicsCount": 3,
      "finalDate": "2100-02-10T10:00:00.000Z"
    }
  ]'
  perform_request "POST" "/lesson/register" "$LESSON_REGISTER_BODY" "$TOKEN"
  if [ "$RESPONSE_STATUS" = "201" ] && printf '%s' "$RESPONSE_BODY" | grep -q "\"name\":\"$LESSON_NAME\""; then
    LESSON_ID="$(json_get_string "$RESPONSE_BODY" "id")"
    if [ -n "$LESSON_ID" ]; then
      record_pass "POST /lesson/register" "$RESPONSE_STATUS"
    else
      record_fail "POST /lesson/register" "$RESPONSE_STATUS" "lesson id not found in response"
    fi
  else
    record_fail "POST /lesson/register" "$RESPONSE_STATUS" "$RESPONSE_BODY"
  fi
fi

if require_token_or_skip "GET /lesson"; then
  perform_request "GET" "/lesson" "" "$TOKEN"
  if [ "$RESPONSE_STATUS" = "200" ] \
    && printf '%s' "$RESPONSE_BODY" | grep -q '"SmokeLessonA"' \
    && printf '%s' "$RESPONSE_BODY" | grep -q '"SmokeLessonB"' \
    && printf '%s' "$RESPONSE_BODY" | grep -q '"SmokeLessonC"'; then
    record_pass "GET /lesson" "$RESPONSE_STATUS"
  else
    record_fail "GET /lesson" "$RESPONSE_STATUS" "$RESPONSE_BODY"
  fi
fi

if require_token_or_skip "PUT /lesson/update/:name"; then
  UPDATE_LESSON_BODY="$(printf '{"name":"%s","difficulty":5,"remainingTopicsCount":12}' "$UPDATED_LESSON_NAME")"
  perform_request "PUT" "/lesson/update/$LESSON_NAME" "$UPDATE_LESSON_BODY" "$TOKEN"
  if [ "$RESPONSE_STATUS" = "200" ] \
    && printf '%s' "$RESPONSE_BODY" | grep -q "\"name\":\"$UPDATED_LESSON_NAME\"" \
    && printf '%s' "$RESPONSE_BODY" | grep -q '"remainingTopicsCount":12'; then
    record_pass "PUT /lesson/update/:name" "$RESPONSE_STATUS"
  else
    record_fail "PUT /lesson/update/:name" "$RESPONSE_STATUS" "$RESPONSE_BODY"
  fi
fi

if require_token_or_skip "GET /lesson (verify)"; then
  perform_request "GET" "/lesson" "" "$TOKEN"
  if [ "$RESPONSE_STATUS" = "200" ] && printf '%s' "$RESPONSE_BODY" | grep -q "\"name\":\"$UPDATED_LESSON_NAME\""; then
    record_pass "GET /lesson (verify)" "$RESPONSE_STATUS"
  else
    record_fail "GET /lesson (verify)" "$RESPONSE_STATUS" "$RESPONSE_BODY"
  fi
fi

if require_token_or_skip "POST /planner/create"; then
  perform_request "POST" "/planner/create" "{}" "$TOKEN"
  if [ "$RESPONSE_STATUS" = "201" ] \
    && printf '%s' "$RESPONSE_BODY" | grep -q '"startDate":"' \
    && printf '%s' "$RESPONSE_BODY" | grep -q '"schedule":{'; then
    record_pass "POST /planner/create" "$RESPONSE_STATUS"
  else
    record_fail "POST /planner/create" "$RESPONSE_STATUS" "$RESPONSE_BODY"
  fi
fi

if require_token_or_skip "GET /planner/schedule"; then
  perform_request "GET" "/planner/schedule" "" "$TOKEN"
  if [ "$RESPONSE_STATUS" = "200" ] \
    && printf '%s' "$RESPONSE_BODY" | grep -q '"startDate":"' \
    && printf '%s' "$RESPONSE_BODY" | grep -q '"schedule":{'; then
    record_pass "GET /planner/schedule" "$RESPONSE_STATUS"
  else
    record_fail "GET /planner/schedule" "$RESPONSE_STATUS" "$RESPONSE_BODY"
  fi
fi

if [ "$CURRENT_DAY_KEY" = "sunday" ]; then
  CHECKLIST_SKIP_REASON="current day is sunday"
  record_skip "POST /checklist/create" "$CHECKLIST_SKIP_REASON"
else
  if require_token_or_skip "POST /checklist/create"; then
    perform_request "POST" "/checklist/create" "{}" "$TOKEN"
    if [ "$RESPONSE_STATUS" = "201" ]; then
      CHECKLIST_CREATED=1
      record_pass "POST /checklist/create" "$RESPONSE_STATUS"
    elif [ "$RESPONSE_STATUS" = "400" ] && printf '%s' "$RESPONSE_BODY" | grep -qi 'planlanmış çalışma bulunmuyor'; then
      CHECKLIST_SKIP_REASON="planner did not create study blocks for today"
      record_skip "POST /checklist/create" "$CHECKLIST_SKIP_REASON"
    else
      record_fail "POST /checklist/create" "$RESPONSE_STATUS" "$RESPONSE_BODY"
    fi
  fi
fi

if [ -n "$CHECKLIST_SKIP_REASON" ] && [ "$CHECKLIST_CREATED" -eq 0 ]; then
  record_skip "GET /checklist/get" "$CHECKLIST_SKIP_REASON"
else
  if require_token_or_skip "GET /checklist/get"; then
    perform_request "GET" "/checklist/get" "" "$TOKEN"
    if [ "$RESPONSE_STATUS" = "200" ]; then
      CHECKLIST_LESSON_ID="$(json_get_string "$RESPONSE_BODY" "lessonId")"
      CHECKLIST_CREATED=1
      record_pass "GET /checklist/get" "$RESPONSE_STATUS"
    elif [ "$RESPONSE_STATUS" = "404" ]; then
      CHECKLIST_SKIP_REASON="checklist was not created for today"
      record_skip "GET /checklist/get" "$CHECKLIST_SKIP_REASON"
    else
      record_fail "GET /checklist/get" "$RESPONSE_STATUS" "$RESPONSE_BODY"
    fi
  fi
fi

if [ "$CURRENT_HOUR" -lt 22 ]; then
  record_skip "POST /checklist/submit" "current hour is before 22:00"
elif [ -z "$CHECKLIST_LESSON_ID" ]; then
  record_skip "POST /checklist/submit" "no checklist lesson available"
else
  if require_token_or_skip "POST /checklist/submit"; then
    SUBMIT_BODY="$(printf '{"lessons":[{"lessonId":"%s","hoursCompleted":2,"difficultyFeedback":4,"focusFeedback":4,"taskFeltLong":false}],"overallFocusScore":4,"overallEnergyScore":4,"todaySleeped":7,"stressLevel":3,"notes":"Smoke test submission"}' "$CHECKLIST_LESSON_ID")"
    perform_request "POST" "/checklist/submit" "$SUBMIT_BODY" "$TOKEN"
    if [ "$RESPONSE_STATUS" = "200" ] && printf '%s' "$RESPONSE_BODY" | grep -q '"submitted":true'; then
      record_pass "POST /checklist/submit" "$RESPONSE_STATUS"
    else
      record_fail "POST /checklist/submit" "$RESPONSE_STATUS" "$RESPONSE_BODY"
    fi
  fi
fi

if [ -z "$LESSON_ID" ]; then
  record_skip "DELETE /lesson/:id" "no lesson id available"
else
  if require_token_or_skip "DELETE /lesson/:id"; then
    perform_request "DELETE" "/lesson/$LESSON_ID" "" "$TOKEN"
    if [ "$RESPONSE_STATUS" = "204" ]; then
      record_pass "DELETE /lesson/:id" "$RESPONSE_STATUS"
    else
      record_fail "DELETE /lesson/:id" "$RESPONSE_STATUS" "$RESPONSE_BODY"
    fi
  fi
fi

if require_token_or_skip "DELETE /person/delete"; then
  perform_request "DELETE" "/person/delete" "" "$TOKEN"
  if [ "$RESPONSE_STATUS" = "204" ]; then
    USER_DELETED=1
    record_pass "DELETE /person/delete" "$RESPONSE_STATUS"
  else
    record_fail "DELETE /person/delete" "$RESPONSE_STATUS" "$RESPONSE_BODY"
  fi
fi

print_summary

if [ "$FAIL_COUNT" -gt 0 ]; then
  exit 1
fi

exit 0
