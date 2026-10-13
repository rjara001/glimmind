#!/usr/bin/env bash
# Reproduces docs/issues/P0/2026-10-12-premium-sin-limite-de-tarjetas.md
# using nothing but curl, jq and python3, so every HTTP status is visible.
#
#   Terminal 1:  npm run emulators
#   Terminal 2:  scripts/repro-p0-curl.sh
#
# Nothing leaves the machine: the emulators are local and no paid API is called.
# Exits 1 while the defect is present, 0 once it is fixed, and 2 if it could not
# tell. A rate-limited or unexpected answer is never reported as a pass.
#
# Note: splitList is limited to 5 requests per minute, so wait a minute between
# runs. The script aborts loudly if it hits that limit rather than guessing.

set -uo pipefail

AUTH="http://localhost:9099"
FS="http://localhost:9080"
FN="http://localhost:9001/fladycard-22a3e/us-central1"
PROJECT="fladycard-22a3e"
DOC="$FS/v1/projects/$PROJECT/databases/(default)/documents"
ADMIN="Authorization: Bearer owner"
CEILING=5000
BASELINE=4100

WORK=$(mktemp -d)
BOLD=$'\033[1m'; DIM=$'\033[2m'; RED=$'\033[31m'; GREEN=$'\033[32m'; YEL=$'\033[33m'; OFF=$'\033[0m'
failures=0
abort() { printf '\n%s   ABORTED: %s%s\n' "$RED" "$1" "$OFF"; exit 2; }

step() { printf '\n%s== %s %s\n' "$BOLD" "$1" "$OFF"; }
note() { printf '%s   %s%s\n' "$DIM" "$1" "$OFF"; }
bad()  { failures=$((failures + 1)); printf '%s   FAIL  %s%s\n' "$RED" "$1" "$OFF"; }
good() { printf '%s   PASS  %s%s\n' "$GREEN" "$1" "$OFF"; }

# POST a function, echo the HTTP status, leave the body in $WORK/out
call_fn() {
  curl -s -o "$WORK/out" -w '%{http_code}' -X POST "$FN/$1" \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    --data-binary "@$2"
}

answer() { jq -c . "$WORK/out" 2>/dev/null || head -c 200 "$WORK/out"; }

card_count() {
  local raw n
  raw=$(curl -s -H "$ADMIN" "$DOC/users/$TARGET_UID/meta/main")
  n=$(printf '%s' "$raw" | jq -r '.fields.cardCount.integerValue // empty' 2>/dev/null)
  [ -n "$n" ] || abort "could not read cardCount from the meta doc: ${raw:0:200}"
  printf '%s' "$n"
}

# Decide whether the ceiling held. Anything that is not a clean accept or a
# clean refusal aborts: a 429 is a rate limit, not a quota decision, and must
# never be mistaken for the server holding the line.
judge() { # $1=label  $2=http code  $3=counter before  $4=counter after  $5=delta
  local label="$1" code="$2" before="$3" after="$4" delta="$5"
  printf '   %s + %s = %s   ceiling %s\n' "$before" "$delta" "$((before + delta))" "$CEILING"
  printf '   -> HTTP %s  %s\n' "$code" "$(answer)"
  printf '   cardCount %s -> %s\n' "$before" "$after"

  case "$code" in
    200)
      if [ "$after" -le "$CEILING" ]; then
        good "$label: accepted, and the ceiling held"
      else
        bad "$label: accepted HTTP 200, cardCount reached $after, $((after - CEILING)) over a $CEILING ceiling"
      fi ;;
    400|500)
      if [ "$after" -eq "$before" ]; then
        good "$label: refused with HTTP $code, counter unchanged"
        [ "$code" = "500" ] && note "the 500 is P1/2026-10-11-quota-exceeded-error-sin-importar.md, not this issue"
      else
        abort "$label was refused but cardCount still moved $before -> $after"
      fi ;;
    429)
      abort "rate limited while testing $label. Wait 60s and rerun; a 429 is not a quota decision." ;;
    *)
      abort "$label answered HTTP $code: $(answer)" ;;
  esac
}

make_body() { # $1=listId-or-empty  $2=n  $3=tag
  python3 - "$1" "$2" "$3" <<'PY' > "$WORK/body.json"
import json, os, sys
list_id, n, tag = sys.argv[1], int(sys.argv[2]), sys.argv[3]
cards = [{"term": f"{tag}-{i}", "definition": "d", "isArchived": False, "currentCycle": 0} for i in range(n)]
if list_id:
    print(json.dumps({"listId": list_id, "associations": cards}))
else:
    print(json.dumps({"name": "deck", "userId": os.environ["TARGET_UID"], "concept": "repro",
                      "settings": {"mode": "normal"}, "associations": cards}))
PY
}

make_split_body() { # $1=listId  $2=tag  $3=groups
  python3 - "$1" "$2" "$3" <<'PY' > "$WORK/body.json"
import json, sys
list_id, tag, groups = sys.argv[1], sys.argv[2], int(sys.argv[3])
cards = lambda t: [{"term": f"{tag}{t}-{i}", "definition": "d"} for i in range(2000)]
print(json.dumps({"listId": list_id,
                  "groups": [{"name": f"{tag}{t}", "associations": cards(t)} for t in "abcdefgh"[:groups]]}))
PY
}

printf '%sP0 reproduction - Premium card ceiling%s\n' "$BOLD" "$OFF"
note "declared ceiling: plans.json tiers.premium.maxCards = $CEILING"

# ------------------------------------------------------------------ 0. emulators
step "0. Emulators reachable"
curl -s --max-time 3 "$FS/" >/dev/null || abort "Firestore emulator is not answering on :9080. Start it with: npm run emulators"
good "Firestore emulator on :9080"

# ------------------------------------------------------------------ 1. the user
step "1. Create a throwaway Premium account"
EMAIL="p0-curl-$(date +%s)@local.test"
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
export TARGET_UID
note "uid  $TARGET_UID"
note "mail $EMAIL"

curl -s -o /dev/null -X PATCH "$DOC/users/$TARGET_UID/meta/main?updateMask.fieldPaths=tier&updateMask.fieldPaths=cardCount&updateMask.fieldPaths=cardQuota" \
  -H "$ADMIN" -H 'Content-Type: application/json' \
  -d "{\"fields\":{\"tier\":{\"stringValue\":\"premium\"},\"cardCount\":{\"integerValue\":\"0\"},\"cardQuota\":{\"integerValue\":\"$CEILING\"}}}"
good "seeded tier=premium cardQuota=$CEILING"

LIST_IDS=()
cleanup() {
  for id in "${LIST_IDS[@]:-}"; do
    [ -n "$id" ] && curl -s -o /dev/null -X DELETE -H "$ADMIN" "$DOC/lists/$id"
  done
  curl -s -o /dev/null -X DELETE -H "$ADMIN" "$DOC/users/$TARGET_UID/meta/main"
  curl -s -o /dev/null -X POST "$AUTH/identitytoolkit.googleapis.com/v1/accounts:delete?key=fake" \
    -H 'Content-Type: application/json' -d "{\"idToken\":\"$TOKEN\"}"
}
trap 'cleanup >/dev/null 2>&1; rm -rf "$WORK"' EXIT

# ------------------------------------------------------------------ 2. the fixture
step "2. Build the account up to $BASELINE cards"
SMALL_ID=""; BIG_ID=""
for n in 100 2000 2000; do
  make_body "" "$n" "s$n"
  code=$(call_fn createList "$WORK/body.json")
  [ "$code" = "200" ] || abort "the fixture failed: createList of $n cards answered HTTP $code: $(answer)"
  id=$(jq -r '.id' "$WORK/out")
  LIST_IDS+=("$id")
  [ "$n" = "100" ] && SMALL_ID="$id"
  [ "$n" = "2000" ] && [ -z "$BIG_ID" ] && BIG_ID="$id"
  printf '   createList %-5s -> HTTP %s  %s\n' "$n" "$code" "$id"
done
base=$(card_count)
[ "$base" = "$BASELINE" ] || abort "the fixture is wrong: cardCount is $base, expected $BASELINE"
good "cardCount = $base, ceiling = $CEILING"

# ------------------------------------------------------------------ 3. createList
step "3. createList across the ceiling   (this route IS bounded)"
before=$(card_count)
make_body "" 2000 "d"
code=$(call_fn createList "$WORK/body.json")
judge "createList" "$code" "$before" "$(card_count)" 2000

# ------------------------------------------------------------------ 4. updateList
step "4. updateList across the ceiling   (this route is NOT bounded)"
before=$(card_count)
make_body "$SMALL_ID" 2000 "grown"
code=$(call_fn updateList "$WORK/body.json")
judge "updateList" "$code" "$before" "$(card_count)" 1900

# ------------------------------------------------------------------ 5. splitList
step "5. splitList across the ceiling   (this route is NOT bounded)"
before=$(card_count)
make_split_body "$BIG_ID" "g" 2
code=$(call_fn splitList "$WORK/body.json")
judge "splitList" "$code" "$before" "$(card_count)" 2000
LAST_ID=$(jq -r '.ids[0] // empty' "$WORK/out")

# ------------------------------------------------------------------ 6. no converge
step "6. The overrun does not converge"
after=$(card_count)
trail="$after"
for round in 1 2; do
  make_split_body "$LAST_ID" "r$round" 2
  code=$(call_fn splitList "$WORK/body.json")
  if [ "$code" != "200" ]; then
    printf '%s   stopped at round %s: HTTP %s%s\n' "$YEL" "$round" "$code" "$OFF"
    note "splitList allows 5 per minute; wait and rerun for the full trail"
    break
  fi
  LAST_ID=$(jq -r '.ids[0]' "$WORK/out")
  LIST_IDS+=("$LAST_ID")
  trail="$trail -> $(card_count)"
done
printf '   cardCount trail: %s   ceiling %s\n' "$trail" "$CEILING"
if [ "${trail##* -> }" -gt "$CEILING" ]; then
  printf '%s   a Premium account can keep growing without bound%s\n' "$YEL" "$OFF"
fi

# ------------------------------------------------------------------ summary
printf '\n%s-- Summary --%s\n' "$BOLD" "$OFF"
if [ "$failures" -gt 0 ]; then
  printf '%s   %d check(s) failed. That is the defect.%s\n' "$RED" "$failures" "$OFF"
  note "As filed on 2026-10-12 exactly two fail, in sections 4 and 5."
  note "A clean run means the ceiling reached updateList and splitList too."
  exit 1
fi
printf '%s   the ceiling held on every route. The P0 is closed.%s\n' "$GREEN" "$OFF"
exit 0