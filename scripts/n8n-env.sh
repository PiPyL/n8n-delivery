#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -f "$PROJECT_ROOT/.env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$PROJECT_ROOT/.env.local"
  set +a
fi

export N8N_HOST="${N8N_HOST:-127.0.0.1}"
export N8N_PORT="${N8N_PORT:-5678}"
export N8N_PROTOCOL="${N8N_PROTOCOL:-http}"

# Force Node.js to resolve IPv4 first to prevent DNS lookup timeouts on some networks/ISPs
export NODE_OPTIONS="${NODE_OPTIONS:-} --dns-result-order=ipv4first"
export N8N_USER_FOLDER="${N8N_USER_FOLDER:-$PROJECT_ROOT/.n8n}"
export N8N_DIAGNOSTICS_ENABLED="${N8N_DIAGNOSTICS_ENABLED:-false}"
export N8N_VERSION_NOTIFICATIONS_ENABLED="${N8N_VERSION_NOTIFICATIONS_ENABLED:-false}"
export N8N_TEMPLATES_ENABLED="${N8N_TEMPLATES_ENABLED:-false}"

if [[ "$N8N_USER_FOLDER" != /* ]]; then
  export N8N_USER_FOLDER="$PROJECT_ROOT/$N8N_USER_FOLDER"
fi

mkdir -p "$N8N_USER_FOLDER"

N8N_BIN="$PROJECT_ROOT/node_modules/.bin/n8n"
if [[ ! -x "$N8N_BIN" ]]; then
  echo "n8n is not installed. Run: npm install" >&2
  exit 1
fi

export PROJECT_ROOT
export N8N_BIN
