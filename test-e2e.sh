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

source "$(dirname "$0")/scripts/e2e-lib.sh"

XWEB="xweb"

setup_e2e

# ── Pre-flight ────────────────────────────────────────────────
section "Pre-flight"

require_bin $XWEB "run npm run build"

if curl -sf --max-time 5 "https://example.com" >/dev/null 2>&1; then
  pass "internet reachable"
else
  fail "no internet access"; exit 1
fi

# ══════════════════════════════════════════════════════════════
# 1. search — basic
# ══════════════════════════════════════════════════════════════
section "1. search — basic"
run_cmd $XWEB search "bash scripting tutorial"
assert_exit0
assert_nonempty

# ══════════════════════════════════════════════════════════════
# 2. search --json
# ══════════════════════════════════════════════════════════════
section "2. search --json"
run_cmd $XWEB search "linux command line" --json
assert_exit0
assert_json_array
assert_contains '"url"'

# ══════════════════════════════════════════════════════════════
# 3. search --limit
# ══════════════════════════════════════════════════════════════
section "3. search --limit"
run_cmd $XWEB search "docker tutorial" --limit 2 --json
assert_exit0
assert_json_array_length_lte "$OUT" 2

# ══════════════════════════════════════════════════════════════
# 4. fetch — markdown (default)
# ══════════════════════════════════════════════════════════════
section "4. fetch — markdown"
run_cmd $XWEB fetch "https://example.com"
assert_exit0
assert_nonempty
assert_contains "^---"

# ══════════════════════════════════════════════════════════════
# 5. fetch --format json
# ══════════════════════════════════════════════════════════════
section "5. fetch --format json"
run_cmd $XWEB fetch "https://example.com" --format json
assert_exit0
assert_json_field "$OUT" "title"
assert_json_field "$OUT" "source"
assert_json_field "$OUT" "content"

# ══════════════════════════════════════════════════════════════
# 6. fetch --format text
# ══════════════════════════════════════════════════════════════
section "6. fetch --format text"
run_cmd $XWEB fetch "https://example.com" --format text
assert_exit0
assert_nonempty

# ══════════════════════════════════════════════════════════════
# 7. fetch --raw
# ══════════════════════════════════════════════════════════════
section "7. fetch --raw"
run_cmd $XWEB fetch "https://example.com" --raw
assert_exit0
assert_nonempty
assert_contains "^---"

# ══════════════════════════════════════════════════════════════
# 8. fetch --selector
# ══════════════════════════════════════════════════════════════
section "8. fetch --selector"
run_cmd $XWEB fetch "https://example.com" --selector "body"
assert_exit0
assert_nonempty

# ══════════════════════════════════════════════════════════════
# 9. explore
# ══════════════════════════════════════════════════════════════
section "9. explore"
run_cmd $XWEB explore "https://example.com"
assert_exit0
assert_nonempty

# ══════════════════════════════════════════════════════════════
# 10. explore --json
# ══════════════════════════════════════════════════════════════
section "10. explore --json"
run_cmd $XWEB explore "https://example.com" --json
assert_exit0
assert_json_array

# ══════════════════════════════════════════════════════════════
# 11. fetch — invalid URL exits non-zero
# ══════════════════════════════════════════════════════════════
section "11. fetch — invalid URL"
run_cmd $XWEB fetch "not-a-url"
assert_nonzero_exit

summary_and_exit
