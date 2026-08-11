#!/usr/bin/env bash
# Smoke-test WhatsApp Cloud API with hello_world (approved on the test WABA).
# Usage: ./scripts/whatsapp-smoke.sh <E164 digits or +E164>
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

TO_RAW="${1:-}"
if [[ -z "$TO_RAW" ]]; then
  echo "Usage: $0 <E164_NUMBER>" >&2
  exit 1
fi
TO="$(echo "$TO_RAW" | tr -cd '0-9')"

load_env() {
  local key="$1"
  python3 -c "
from pathlib import Path
for line in Path('.env.local').read_text().splitlines():
  if line.startswith('${key}='):
    print(line.split('=', 1)[1])
    break
"
}

TOKEN="$(load_env WHATSAPP_SYSTEM_USER_TOKEN)"
PHONE_ID="$(load_env WHATSAPP_PHONE_NUMBER_ID)"
VERSION="$(load_env WHATSAPP_GRAPH_VERSION)"
VERSION="${VERSION:-v23.0}"

if [[ -z "$TOKEN" || -z "$PHONE_ID" ]]; then
  echo "Missing WHATSAPP_SYSTEM_USER_TOKEN or WHATSAPP_PHONE_NUMBER_ID in .env.local" >&2
  exit 1
fi

echo "Sending hello_world to ${TO} via phone_number_id=${PHONE_ID}..."
RESP="$(curl -sS -X POST "https://graph.facebook.com/${VERSION}/${PHONE_ID}/messages" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"messaging_product\":\"whatsapp\",\"to\":\"${TO}\",\"type\":\"template\",\"template\":{\"name\":\"hello_world\",\"language\":{\"code\":\"en_US\"}}}")"

echo "$RESP" | python3 -m json.tool
echo "$RESP" | python3 -c 'import sys,json; d=json.load(sys.stdin); raise SystemExit(0 if d.get("messages") else 1)'
