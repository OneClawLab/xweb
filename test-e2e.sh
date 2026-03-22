#!/usr/bin/env bash
#
# xweb CLI End-to-End Test Script — core functionality
#
# Prerequisites:
#   - xweb installed: npm run build && npm link
#   - Internet access required (search and fetch make real HTTP requests)
#   - Optional: configure a search API key for better search quality:
#       ~/.config/xweb/default.json  (brave/tavily/serper api_key)
#     Without API key, search falls back to built-in simple provider (no key needed).
#
# Usage: bash test-e2e.sh
#
set -uo pipefail

XWEB="xweb"
TD=$(mktemp -d)
PASS=0; FAIL=0

cleanup() { rm -rf "$TD"; }
trap cleanup EXIT

G() { printf "\033[32m  ✓ %s\033[0m\n" "$*"; PASS=$((PASS+1)); }
R() { printf "\033[31m  ✗ %s\033[0m\n" "$*"; FAIL=$((FAIL+1)); }
S() { echo ""; printf "\033[33m━━ %s ━━\033[0m\n" "$*"; }

# ── Pre-flight ────────────────────────────────────────────────
S "Pre-flight"
if $XWEB --version >/dev/null 2>&1; then G "xweb binary OK"; else R "xweb broken — run npm run build"; exit 1; fi
if curl -sf --max-time 5 "https://example.com" >/dev/null 2>&1; then G "internet reachable"; else R "no internet access"; exit 1; fi

# ══════════════════════════════════════════════════════════════
# 1. search — basic
# ══════════════════════════════════════════════════════════════
S "1. search — basic"
OUT="$TD/1.txt"
$XWEB search "bash scripting tutorial" >"$OUT" 2>/dev/null
EC=$?
[[ $EC -eq 0 ]] && G "exit=0" || R "exit=$EC"
[[ -s "$OUT" ]] && G "stdout non-empty" || R "stdout empty"

# ══════════════════════════════════════════════════════════════
# 2. search --json
# ══════════════════════════════════════════════════════════════
S "2. search --json"
OUT="$TD/2.txt"
$XWEB search "linux command line" --json >"$OUT" 2>/dev/null
EC=$?
[[ $EC -eq 0 ]] && G "exit=0" || R "exit=$EC"
if node -e "const d=JSON.parse(require('fs').readFileSync('$OUT','utf8')); if(!Array.isArray(d)||!d[0]?.url) throw 0" 2>/dev/null; then
  G "valid JSON array with url field"
else
  R "invalid JSON or missing url"
fi

# ══════════════════════════════════════════════════════════════
# 3. search --limit
# ══════════════════════════════════════════════════════════════
S "3. search --limit"
OUT="$TD/3.txt"
$XWEB search "docker tutorial" --limit 2 --json >"$OUT" 2>/dev/null
EC=$?
[[ $EC -eq 0 ]] && G "exit=0" || R "exit=$EC"
COUNT=$(node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync('$OUT','utf8')).length))" 2>/dev/null)
[[ "$COUNT" -le 2 ]] && G "respects --limit 2 (got $COUNT)" || R "--limit not respected (got $COUNT)"

# ══════════════════════════════════════════════════════════════
# 4. fetch — markdown (default)
# ══════════════════════════════════════════════════════════════
S "4. fetch — markdown"
OUT="$TD/4.txt"
$XWEB fetch "https://example.com" >"$OUT" 2>/dev/null
EC=$?
[[ $EC -eq 0 ]] && G "exit=0" || R "exit=$EC"
[[ -s "$OUT" ]] && G "stdout non-empty" || R "stdout empty"
grep -q "^---" "$OUT" && G "has YAML front matter" || R "missing front matter"

# ══════════════════════════════════════════════════════════════
# 5. fetch --format json
# ══════════════════════════════════════════════════════════════
S "5. fetch --format json"
OUT="$TD/5.txt"
$XWEB fetch "https://example.com" --format json >"$OUT" 2>/dev/null
EC=$?
[[ $EC -eq 0 ]] && G "exit=0" || R "exit=$EC"
if node -e "const d=JSON.parse(require('fs').readFileSync('$OUT','utf8')); if(!d.title||!d.source||!d.content) throw 0" 2>/dev/null; then
  G "valid JSON with title/source/content"
else
  R "invalid JSON or missing fields"
fi

# ══════════════════════════════════════════════════════════════
# 6. fetch --format text
# ══════════════════════════════════════════════════════════════
S "6. fetch --format text"
OUT="$TD/6.txt"
$XWEB fetch "https://example.com" --format text >"$OUT" 2>/dev/null
EC=$?
[[ $EC -eq 0 ]] && G "exit=0" || R "exit=$EC"
[[ -s "$OUT" ]] && G "stdout non-empty" || R "stdout empty"

# ══════════════════════════════════════════════════════════════
# 7. fetch --raw
# ══════════════════════════════════════════════════════════════
S "7. fetch --raw"
OUT="$TD/7.txt"
$XWEB fetch "https://example.com" --raw >"$OUT" 2>/dev/null
EC=$?
[[ $EC -eq 0 ]] && G "exit=0" || R "exit=$EC"
grep -qi "<html\|<!DOCTYPE" "$OUT" && G "raw HTML returned" || R "missing HTML tags"

# ══════════════════════════════════════════════════════════════
# 8. fetch --selector
# ══════════════════════════════════════════════════════════════
S "8. fetch --selector"
OUT="$TD/8.txt"
$XWEB fetch "https://example.com" --selector "body" >"$OUT" 2>/dev/null
EC=$?
[[ $EC -eq 0 ]] && G "exit=0" || R "exit=$EC"
[[ -s "$OUT" ]] && G "stdout non-empty" || R "stdout empty"

# ══════════════════════════════════════════════════════════════
# 9. explore
# ══════════════════════════════════════════════════════════════
S "9. explore"
OUT="$TD/9.txt"
$XWEB explore "https://example.com" >"$OUT" 2>/dev/null
EC=$?
[[ $EC -eq 0 ]] && G "exit=0" || R "exit=$EC"
[[ -s "$OUT" ]] && G "stdout non-empty" || R "stdout empty"

# ══════════════════════════════════════════════════════════════
# 10. explore --json
# ══════════════════════════════════════════════════════════════
S "10. explore --json"
OUT="$TD/10.txt"
$XWEB explore "https://example.com" --json >"$OUT" 2>/dev/null
EC=$?
[[ $EC -eq 0 ]] && G "exit=0" || R "exit=$EC"
if node -e "const d=JSON.parse(require('fs').readFileSync('$OUT','utf8')); if(!Array.isArray(d)) throw 0" 2>/dev/null; then
  G "valid JSON array"
else
  R "invalid JSON or not array"
fi

# ══════════════════════════════════════════════════════════════
# 11. fetch — invalid URL exits 1
# ══════════════════════════════════════════════════════════════
S "11. fetch — invalid URL"
$XWEB fetch "not-a-url" >/dev/null 2>&1
EC=$?
[[ $EC -ne 0 ]] && G "non-zero exit for invalid URL" || R "expected non-zero exit"

# ══════════════════════════════════════════════════════════════
# Summary
# ══════════════════════════════════════════════════════════════
S "Results"
echo ""
TOTAL=$((PASS + FAIL))
printf "  Passed: \033[32m%d\033[0m\n" "$PASS"
printf "  Failed: %s\n" "$( [[ $FAIL -gt 0 ]] && printf "\033[31m%d\033[0m" "$FAIL" || echo 0 )"
echo "  Total:  $TOTAL"
echo ""
[[ $FAIL -eq 0 ]] && printf "\033[32mAll tests passed!\033[0m\n" && exit 0
printf "\033[31mSome tests failed.\033[0m\n" && exit 1
