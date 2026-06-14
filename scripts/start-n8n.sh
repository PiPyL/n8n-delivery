#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/n8n-env.sh"

echo "Starting n8n at ${N8N_PROTOCOL}://${N8N_HOST}:${N8N_PORT}"
echo "User folder: ${N8N_USER_FOLDER}"
exec "$N8N_BIN" start
