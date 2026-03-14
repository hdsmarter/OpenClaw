#!/bin/bash
# test-dashboard.sh — BDD-style tests for dashboard files
# Usage: ./tests/test-dashboard.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DASH="$REPO_ROOT/dashboard"
PASS=0
FAIL=0

describe() { printf "\n\033[1m%s\033[0m\n" "$1"; }
it() { printf "  %-55s" "$1"; }
pass() { printf "\033[0;32mPASS\033[0m\n"; PASS=$((PASS + 1)); }
fail() { printf "\033[0;31mFAIL\033[0m — %s\n" "$1"; FAIL=$((FAIL + 1)); }

# ─── Dashboard Files ──────────────────────────

describe "Dashboard Files"

it "should have index.html"
if [[ -f "$DASH/index.html" ]]; then pass; else fail "not found"; fi

it "should have all 8 JS files"
EXPECTED_JS="pixel-sprites.js office-scene.js status-fetcher.js gateway-client.js notifications.js chat-panel.js settings-panel.js app.js"
ALL_FOUND=true
for f in $EXPECTED_JS; do
  [[ -f "$DASH/js/$f" ]] || ALL_FOUND=false
done
if $ALL_FOUND; then pass; else fail "missing JS file(s)"; fi

it "should have styles.css"
if [[ -f "$DASH/css/styles.css" ]]; then pass; else fail "not found"; fi

it "should not use innerHTML (XSS safety)"
if grep -rn 'innerHTML' "$DASH/js/"*.js >/dev/null 2>&1; then
  fail "innerHTML found"
else
  pass
fi

it "should have roundRect polyfill"
if grep -q 'roundRect' "$DASH/js/pixel-sprites.js" && \
   grep -q 'prototype.roundRect' "$DASH/js/pixel-sprites.js"; then
  pass
else
  fail "polyfill missing"
fi

it "should have viewport-fit=cover meta"
if grep -q 'viewport-fit=cover' "$DASH/index.html"; then pass; else fail "missing"; fi

it "should have Traditional Chinese UI strings"
if grep -q '繁體\|對話\|閘道器\|連線\|發送\|設定\|訊息\|離線' "$DASH/js/chat-panel.js" && \
   grep -q '閘道器\|認證令牌\|連線\|儲存' "$DASH/js/settings-panel.js"; then
  pass
else
  fail "missing zh-Hant strings"
fi

it "should have mobile media queries"
if grep -q '@media.*max-width.*640px' "$DASH/css/styles.css"; then pass; else fail "missing"; fi

# ─── Gateway Client ───────────────────────────

describe "Gateway Client"

it "should default to ws://localhost:18789"
if grep -q 'ws://localhost:18789' "$DASH/js/gateway-client.js"; then pass; else fail "wrong default"; fi

it "should support custom URL from localStorage"
if grep -q 'localStorage.getItem' "$DASH/js/gateway-client.js"; then pass; else fail "no localStorage"; fi

it "should have exponential backoff"
if grep -q 'reconnectMax\|reconnectDelay.*\*.*2' "$DASH/js/gateway-client.js"; then pass; else fail "no backoff"; fi

# ─── Chat Panel ───────────────────────────────

describe "Chat Panel"

it "should have all UI_TEXT keys in Traditional Chinese"
KEYS_OK=true
for key in title placeholder send offline typing close noAgent; do
  if ! grep -q "$key:" "$DASH/js/chat-panel.js" 2>/dev/null; then
    fail "missing key: $key"
    KEYS_OK=false
    break
  fi
done
if $KEYS_OK; then pass; fi

it "should use DOM methods (no innerHTML)"
if grep -q 'innerHTML' "$DASH/js/chat-panel.js" 2>/dev/null; then
  fail "uses innerHTML"
else
  pass
fi

# ─── Settings Panel ──────────────────────────

describe "Settings Panel"

it "should have test connection feature"
if grep -q 'testConnection' "$DASH/js/settings-panel.js"; then pass; else fail "missing"; fi

it "should save to localStorage"
if grep -q 'saveSettings' "$DASH/js/settings-panel.js"; then pass; else fail "missing"; fi

# ─── Script Load Order ───────────────────────

describe "Script Load Order"

it "should load gateway-client before app.js"
GW_LINE=$(grep -n 'gateway-client' "$DASH/index.html" | head -1 | cut -d: -f1)
APP_LINE=$(grep -n 'app.js' "$DASH/index.html" | head -1 | cut -d: -f1)
if [[ -n "$GW_LINE" && -n "$APP_LINE" && "$GW_LINE" -lt "$APP_LINE" ]]; then
  pass
else
  fail "wrong order"
fi

it "should load chat-panel before app.js"
CP_LINE=$(grep -n 'chat-panel' "$DASH/index.html" | head -1 | cut -d: -f1)
if [[ -n "$CP_LINE" && -n "$APP_LINE" && "$CP_LINE" -lt "$APP_LINE" ]]; then
  pass
else
  fail "wrong order"
fi

# ─── Summary ──────────────────────────────────

printf "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
printf "  Results: \033[0;32m%d passed\033[0m" "$PASS"
if [[ $FAIL -gt 0 ]]; then
  printf ", \033[0;31m%d failed\033[0m" "$FAIL"
fi
printf "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"

exit "$FAIL"
