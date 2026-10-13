#!/usr/bin/env bash
# Reproduces docs/issues/P0/2026-10-12-rutas-ia-sin-rate-limit.md
# using nothing but curl and jq, so every HTTP status is visible.
#
#   Terminal 1:  npm run emulators
#   Terminal 2:  scripts/repro-p0-ai-rate-limit.sh
#
# Nothing leaves the machine and no Gemini call is ever made: both AI routes are
# probed on the validation path, which is enough because the limiter sits at the
# top of the handler and counts every request whatever the body is. The control
# below proves it: createList answers 429 on an equally invalid body.
#
# Requests are fired one at a time on purpose. The limiter is an in-memory map
# per function instance, and the emulator runs more than one instance of the
# same function; a concurrent burst is spread across them and each keeps its own
# counter, so a concurrent probe would undercount and never reach any tier.
# Sequential requests reuse one instance and accumulate, which is the behaviour
# that matters.
#
# Exits 1 while the defect is present (the AI routes answer a burst with no
# 429), 0 once the rate limit is in place, and 2 if it could not tell. The
# control must produce a 429, otherwise the harness is broken and no conclusion
# is drawn.

set -uo pipefail

AUTH="http://localhost:9099"
FN="http://localhost:9001/fladycard-22a3e/us-central1"
AI_LIMIT=10        # RATE_LIMITS.aiGroup.requests, utils/rateLimit.js:5
CONTROL_LIMIT=20   # RATE_LIMITS.createList.requests
BURST=$((AI_LIMIT + 1))
CONTROL_BURST=$((CONTROL_LIMIT + 1))

WORK=$(mktemp -d)
BOLD=$'\033[1m'; DIM=$'\033[2m'; RED=$'\033[31m'; GREEN=$'\033[32m'; OFF=$'\033[0m'

step() { printf '\n%s== %s %s\n' "$BOLD" "$1" "$OFF"; }
note() { printf '%s   %s%s\n' "$DIM" "$1" "$OFF"; }
good() { printf '%s   PASS  %s%s\n' "$GREEN" "$1" "$OFF"; }
bad()  { printf '%s   FAIL  %s%s\n' "$RED" "$1" "$OFF"; }
abort(){ printf '\n%s   ABORTED: %s%s\n' "$RED" "$1" "$OFF"; exit 2; }

count_of() { grep -c "^$2$" "$1" 2>/dev/null || true; }

burst() { # $1=route  $2=body-json  $3=n  $4=code-file
  : > "$4"
  local i code
  for i in $(seq 1 "$3"); do
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 -X POST "$FN/$1" \
      -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
      --data-binary "$2")
    printf '%s\n' "$code" >> "$4"
  done
  printf '   %s: %s requests fired sequentially\n' "$1" "$3"
  sort "$4" | uniq -c | awk '{printf "   %sx HTTP %s\n", $1, $2}'
}

printf '%sP0 reproduction - AI deck routes have no rate limit%s\n' "$BOLD" "$OFF"
note "declared policy: aiGroup = $AI_LIMIT requests per minute (defined, unused)"
note "every other measured route answers HTTP 429 past its tier"

# ------------------------------------------------------------------ 0. emulators
step "0. Emulators reachable"
curl -s --max-time 3 "http://localhost:9080/" >/dev/null || abort "Firestore emulator is not answering on :9080. Start it with: npm run emulators"
curl -s --max-time 3 "$FN/" >/dev/null || abort "Functions emulator is not answering on :9001. Start it with: npm run emulators"
good "emulators on :9080 and :9001"

# ------------------------------------------------------------------ 1. the user
step "1. Create a throwaway account"
EMAIL="p0-rl-$(date +%s)@local.test"
TOKEN=$(curl -s -X POST "$AUTH/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"p0repro123\",\"returnSecureToken\":true}" | jq -r '.idToken // empty')
[ -n "$TOKEN" ] || abort "the auth emulator did not return a token"
TARGET_UID=$(python3 -c '
import base64,json,sys
p=sys.argv[1].split(".")[1]
p+="="*(-len(p)%4)
print(json.loads(base64.urlsafe_b64decode(p))["user_id"])' "$TOKEN")
[ -n "$TARGET_UID" ] || abort "could not read the uid out of the id token"
note "uid  $TARGET_UID"
note "mail $EMAIL"

cleanup() {
  curl -s -o /dev/null -X POST "$AUTH/identitytoolkit.googleapis.com/v1/accounts:delete?key=fake" \
    -H 'Content-Type: application/json' -d "{\"idToken\":\"$TOKEN\"}"
  rm -rf "$WORK"
}
trap 'cleanup >/dev/null 2>&1' EXIT

# ------------------------------------------------------------------ 2. control
step "2. Control: createList, limit $CONTROL_LIMIT/min"
note "body is deliberately invalid; the limiter runs before validation"
burst "createList" '{}' "$CONTROL_BURST" "$WORK/createList.codes"
CONTROL_429=$(count_of "$WORK/createList.codes" 429)
if [ "$CONTROL_429" -ge 1 ]; then
  good "control: HTTP 429 past the tier. The mechanism works and the harness is sound."
else
  abort "control got no 429 on a route that is limited. The harness cannot tell."
fi

# ------------------------------------------------------------------ 3. createDeckFromText
step "3. createDeckFromText, aiGroup $AI_LIMIT/min, burst of $BURST"
note "body omits 'text', so the route answers 400 before any Gemini call"
burst "createDeckFromText" '{}' "$BURST" "$WORK/createDeckFromText.codes"
TEXT_429=$(count_of "$WORK/createDeckFromText.codes" 429)

# ------------------------------------------------------------------ 4. createYouTubeDeck
step "4. createYouTubeDeck, aiGroup $AI_LIMIT/min, burst of $BURST"
note "url is not a YouTube link, so the route answers 400 before any Gemini call"
burst "createYouTubeDeck" '{"url":"not-a-url"}' "$BURST" "$WORK/createYouTubeDeck.codes"
YT_429=$(count_of "$WORK/createYouTubeDeck.codes" 429)

# ------------------------------------------------------------------ summary
printf '\n%s-- Summary --%s\n' "$BOLD" "$OFF"
printf '   control (createList, limited):   %s x 429 out of %s\n' "$CONTROL_429" "$CONTROL_BURST"
printf '   createDeckFromText (unlimited):  %s x 429 out of %s\n' "$TEXT_429" "$BURST"
printf '   createYouTubeDeck (unlimited):   %s x 429 out of %s\n' "$YT_429" "$BURST"

if [ "$TEXT_429" -ge 1 ] && [ "$YT_429" -ge 1 ]; then
  good "both AI routes refused past $AI_LIMIT/min. The rate limit is in place."
  exit 0
fi

bad "neither AI route refused a burst of $BURST against a $AI_LIMIT/min policy. The defect is present."
exit 1
