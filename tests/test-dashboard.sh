#!/bin/bash
# test-dashboard.sh — BDD-style tests for dashboard files
# Usage: ./tests/test-dashboard.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DASH="$REPO_ROOT/dashboard"
SKILLS_DIR="$HOME/.claude/skills"
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

it "should have all 9 JS files"
EXPECTED_JS="i18n.js pixel-sprites.js office-scene.js status-fetcher.js chat-client.js notifications.js chat-panel.js settings-panel.js app.js"
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

it "should have mobile media queries"
if grep -q '@media.*max-width.*640px' "$DASH/css/styles.css"; then pass; else fail "missing"; fi

it "should have reduced-motion media query"
if grep -q 'prefers-reduced-motion' "$DASH/css/styles.css"; then pass; else fail "missing"; fi

# ─── Theme System ──────────────────────────────

describe "Theme System"

it "should have ThemePalette in pixel-sprites.js"
if grep -q 'ThemePalette' "$DASH/js/pixel-sprites.js"; then pass; else fail "missing"; fi

it "should have light and dark palettes"
if grep -q "'light'" "$DASH/js/pixel-sprites.js" && \
   grep -q "'dark'" "$DASH/js/pixel-sprites.js"; then
  pass
else
  fail "missing theme variants"
fi

it "should have theme toggle button in index.html"
if grep -q 'theme-btn' "$DASH/index.html"; then pass; else fail "missing"; fi

it "should have ThemePalette.init() in app.js"
if grep -q 'ThemePalette.init' "$DASH/js/app.js"; then pass; else fail "missing"; fi

it "should have CSS custom properties for dual theme"
if grep -q 'data-theme.*dark' "$DASH/css/styles.css" && \
   grep -q '\-\-bg:' "$DASH/css/styles.css"; then
  pass
else
  fail "missing CSS vars"
fi

it "should not hardcode canvas colors (use ThemePalette)"
# Check that drawing functions reference ThemePalette.current
if grep -q 'ThemePalette.current' "$DASH/js/pixel-sprites.js"; then
  pass
else
  fail "hardcoded colors in sprites"
fi

# ─── Grid Layout ────────────────────────────────

describe "Grid Layout (28x18 Manufacturing HQ)"

it "should have 28 columns"
if grep -q 'this.cols = 28' "$DASH/js/office-scene.js"; then pass; else fail "wrong cols"; fi

it "should have 18 rows"
if grep -q 'this.rows = 18' "$DASH/js/office-scene.js"; then pass; else fail "wrong rows"; fi

it "should have new tile types (4=lobby, 5=factory, 6=corridor, 7=glass)"
HAS_NEW_TILES=true
for t in drawLobbyFloor drawFactoryFloor drawCorridorFloor drawGlassWall; do
  grep -q "$t" "$DASH/js/pixel-sprites.js" || HAS_NEW_TILES=false
done
if $HAS_NEW_TILES; then pass; else fail "missing tile types"; fi

it "should render tile types 4-7 in office-scene"
if grep -q 'case 4:' "$DASH/js/office-scene.js" && \
   grep -q 'case 7:' "$DASH/js/office-scene.js"; then
  pass
else
  fail "missing tile cases"
fi

# ─── New Furniture ──────────────────────────────

describe "New Furniture Sprites"

it "should have reception desk sprite"
if grep -q 'drawReceptionDesk' "$DASH/js/pixel-sprites.js"; then pass; else fail "missing"; fi

it "should have security desk sprite"
if grep -q 'drawSecurityDesk' "$DASH/js/pixel-sprites.js"; then pass; else fail "missing"; fi

it "should have sofa sprite"
if grep -q 'drawSofa' "$DASH/js/pixel-sprites.js"; then pass; else fail "missing"; fi

it "should have monitor wall sprite"
if grep -q 'drawMonitorWall' "$DASH/js/pixel-sprites.js"; then pass; else fail "missing"; fi

it "should have conveyor belt sprite"
if grep -q 'drawConveyorBelt' "$DASH/js/pixel-sprites.js"; then pass; else fail "missing"; fi

it "should have safety sign sprite"
if grep -q 'drawSafetySign' "$DASH/js/pixel-sprites.js"; then pass; else fail "missing"; fi

it "should render new furniture types in office-scene"
HAS_FURN=true
for t in receptionDesk securityDesk sofa monitorWall conveyor safetySign; do
  grep -q "'$t'" "$DASH/js/office-scene.js" || HAS_FURN=false
done
if $HAS_FURN; then pass; else fail "missing furniture render"; fi

# ─── i18n ────────────────────────────────────

describe "i18n"

it "should have i18n.js with zh-TW strings"
if grep -q 'zh-TW' "$DASH/js/i18n.js"; then pass; else fail "missing zh-TW"; fi

it "should have i18n.js with zh-CN strings"
if grep -q 'zh-CN' "$DASH/js/i18n.js"; then pass; else fail "missing zh-CN"; fi

it "should have i18n.js with en strings"
if grep -q "'en'" "$DASH/js/i18n.js"; then pass; else fail "missing en"; fi

it "should load i18n.js before all other scripts"
I18N_LINE=$(grep -n 'i18n.js' "$DASH/index.html" | head -1 | cut -d: -f1)
PIXEL_LINE=$(grep -n 'pixel-sprites.js' "$DASH/index.html" | head -1 | cut -d: -f1)
if [[ -n "$I18N_LINE" && -n "$PIXEL_LINE" && "$I18N_LINE" -lt "$PIXEL_LINE" ]]; then
  pass
else
  fail "i18n.js not first"
fi

it "should have theme-related i18n keys"
if grep -q 'app.themeToggle' "$DASH/js/i18n.js" && \
   grep -q 'app.themeLight' "$DASH/js/i18n.js"; then
  pass
else
  fail "missing theme i18n"
fi

it "should have OpenRouter i18n keys"
if grep -q 'settings.chatModeOr' "$DASH/js/i18n.js" && \
   grep -q 'settings.orApiKeyLabel' "$DASH/js/i18n.js"; then
  pass
else
  fail "missing OR i18n"
fi

it "should have streaming i18n key"
if grep -q 'chat.streaming' "$DASH/js/i18n.js"; then pass; else fail "missing"; fi

# ─── Agents ──────────────────────────────────

describe "Agents"

it "should have 16 agent palettes"
PALETTE_COUNT=$(grep -c 'shirt:' "$DASH/js/pixel-sprites.js" || true)
if [[ "$PALETTE_COUNT" -ge 16 ]]; then pass; else fail "found $PALETTE_COUNT palettes"; fi

it "should have 16 seats in office-scene"
SEAT_COUNT=$(grep -c 'col:.*row:.*dir:' "$DASH/js/office-scene.js" || true)
if [[ "$SEAT_COUNT" -ge 16 ]]; then pass; else fail "found $SEAT_COUNT seats"; fi

it "should have 16 agent name keys in i18n"
AGENT_KEYS=$(grep -c "'agent\." "$DASH/js/i18n.js" || true)
if [[ "$AGENT_KEYS" -ge 16 ]]; then pass; else fail "found $AGENT_KEYS agent keys"; fi

# ─── Chat Client ─────────────────────────────

describe "Chat Client"

it "should have chat-client.js (not gateway-client.js)"
if [[ -f "$DASH/js/chat-client.js" ]] && ! grep -q 'gateway-client' "$DASH/index.html"; then
  pass
else
  fail "chat-client.js missing or gateway-client still referenced"
fi

it "should support Telegram mode"
if grep -q 'telegram' "$DASH/js/chat-client.js" && grep -q 'api.telegram.org' "$DASH/js/chat-client.js"; then
  pass
else
  fail "no Telegram support"
fi

it "should support Gateway WebSocket mode"
if grep -q 'WebSocket' "$DASH/js/chat-client.js"; then pass; else fail "no WebSocket"; fi

it "should support OpenRouter API mode"
if grep -q 'openrouter' "$DASH/js/chat-client.js" && \
   grep -q 'openrouter.ai' "$DASH/js/chat-client.js"; then
  pass
else
  fail "no OpenRouter support"
fi

it "should have SSE streaming support"
if grep -q '_readSSEStream' "$DASH/js/chat-client.js" && \
   grep -q 'stream.*true' "$DASH/js/chat-client.js"; then
  pass
else
  fail "no SSE streaming"
fi

it "should have 16 agent system prompts"
PROMPT_COUNT=$(grep -c 'You are a' "$DASH/js/chat-client.js" || true)
if [[ "$PROMPT_COUNT" -ge 16 ]]; then pass; else fail "found $PROMPT_COUNT prompts"; fi

it "should have exponential backoff"
if grep -q 'reconnectMax\|reconnectDelay.*\*.*2\|_reconnectDelay' "$DASH/js/chat-client.js"; then
  pass
else
  fail "no backoff"
fi

# ─── Chat Panel ───────────────────────────────

describe "Chat Panel"

it "should use I18n.t() for UI text"
if grep -q 'I18n.t(' "$DASH/js/chat-panel.js"; then pass; else fail "not using I18n"; fi

it "should use DOM methods (no innerHTML)"
if grep -q 'innerHTML' "$DASH/js/chat-panel.js" 2>/dev/null; then
  fail "uses innerHTML"
else
  pass
fi

it "should have streaming message support"
if grep -q 'startStreamingMessage' "$DASH/js/chat-panel.js" && \
   grep -q 'updateLastAgentMessage' "$DASH/js/chat-panel.js"; then
  pass
else
  fail "missing streaming support"
fi

it "should have ARIA attributes for accessibility"
if grep -q 'aria-label' "$DASH/js/chat-panel.js" && \
   grep -q 'aria-live' "$DASH/js/chat-panel.js"; then
  pass
else
  fail "missing ARIA"
fi

# ─── Settings Panel ──────────────────────────

describe "Settings Panel"

it "should have language selector"
if grep -q 'langSelect\|langLabel' "$DASH/js/settings-panel.js"; then pass; else fail "missing"; fi

it "should have chat mode selector"
if grep -q 'modeSelect\|chatMode' "$DASH/js/settings-panel.js"; then pass; else fail "missing"; fi

it "should have OpenRouter fields"
if grep -q 'orApiKeyInput\|orFieldsContainer' "$DASH/js/settings-panel.js"; then
  pass
else
  fail "missing OR fields"
fi

it "should have test connection feature"
if grep -q 'testConnection' "$DASH/js/settings-panel.js"; then pass; else fail "missing"; fi

it "should support three chat modes"
if grep -q "'telegram'" "$DASH/js/settings-panel.js" && \
   grep -q "'gateway'" "$DASH/js/settings-panel.js" && \
   grep -q "'openrouter'" "$DASH/js/settings-panel.js"; then
  pass
else
  fail "missing mode support"
fi

# ─── CSS Design System ──────────────────────

describe "CSS Design System"

it "should use CSS custom properties (no hardcoded colors)"
VAR_COUNT=$(grep -c 'var(--' "$DASH/css/styles.css" || true)
if [[ "$VAR_COUNT" -ge 30 ]]; then pass; else fail "found only $VAR_COUNT var() usages"; fi

it "should have light theme as default"
if grep -q ':root {' "$DASH/css/styles.css" && \
   grep -q '\-\-bg: #f5f5f0' "$DASH/css/styles.css"; then
  pass
else
  fail "light theme not default"
fi

it "should have dark theme override"
if grep -q 'data-theme.*dark' "$DASH/css/styles.css"; then pass; else fail "missing"; fi

it "should have focus-visible styles for accessibility"
if grep -q 'focus-visible' "$DASH/css/styles.css"; then pass; else fail "missing"; fi

# ─── Script Load Order ───────────────────────

describe "Script Load Order"

it "should load chat-client before app.js"
CC_LINE=$(grep -n 'chat-client' "$DASH/index.html" | head -1 | cut -d: -f1)
APP_LINE=$(grep -n 'app.js' "$DASH/index.html" | head -1 | cut -d: -f1)
if [[ -n "$CC_LINE" && -n "$APP_LINE" && "$CC_LINE" -lt "$APP_LINE" ]]; then
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

# ─── Accessibility ──────────────────────────

describe "Accessibility"

it "should have ARIA roles in index.html"
if grep -q 'role=' "$DASH/index.html"; then pass; else fail "missing ARIA roles"; fi

it "should have aria-labels on buttons"
if grep -q 'aria-label' "$DASH/index.html"; then pass; else fail "missing"; fi

# ─── Skills ──────────────────────────────────

describe "Claude Skills"

SKILL_SLUGS="nexus-data-analyst nexus-marketing nexus-finance nexus-hr nexus-supply-chain nexus-it-architect nexus-project-mgr nexus-customer-svc nexus-legal nexus-product-mgr nexus-ux-designer nexus-content nexus-bd nexus-quality nexus-security nexus-hr-director"

it "should have 16 skill directories"
SKILL_COUNT=0
for slug in $SKILL_SLUGS; do
  [[ -d "$SKILLS_DIR/$slug" ]] && SKILL_COUNT=$((SKILL_COUNT + 1))
done
if [[ "$SKILL_COUNT" -ge 16 ]]; then pass; else fail "found $SKILL_COUNT/16 skills"; fi

it "should have SKILL.md in each skill directory"
ALL_SKILLS=true
for slug in $SKILL_SLUGS; do
  [[ -f "$SKILLS_DIR/$slug/SKILL.md" ]] || ALL_SKILLS=false
done
if $ALL_SKILLS; then pass; else fail "missing SKILL.md files"; fi

# ─── Summary ──────────────────────────────────

printf "\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n"
printf "  Results: \033[0;32m%d passed\033[0m" "$PASS"
if [[ $FAIL -gt 0 ]]; then
  printf ", \033[0;31m%d failed\033[0m" "$FAIL"
fi
printf "\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\n"

exit "$FAIL"
