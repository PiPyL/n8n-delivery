#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/n8n-env.sh"

IMPORT_READY_DIR="$N8N_USER_FOLDER/import-ready"

echo "Preparing import-ready workflow JSON with stable workflow ids"
node "$PROJECT_ROOT/scripts/prepare-import-workflows.mjs"

echo "Cleaning obsolete workflows from database..."
node "$PROJECT_ROOT/scripts/clean-obsolete-workflows.mjs"

echo "Importing all workflows..."
for workflow in "$IMPORT_READY_DIR"/*.json; do
  echo "Importing $(basename "$workflow")"
  "$N8N_BIN" import:workflow --input="$workflow"
done

echo "Publishing all workflows using n8n CLI..."
export N8N_USER_FOLDER="$N8N_USER_FOLDER"
ACTIVE_IDS_FILE="$N8N_USER_FOLDER/active_ids.txt"

if [[ -f "$ACTIVE_IDS_FILE" ]]; then
  while IFS= read -r id || [[ -n "$id" ]]; do
    [[ -z "$id" ]] && continue
    echo "Publishing $id..."
    "$N8N_BIN" publish:workflow --id="$id" || echo "Warning: Failed to publish $id, skipping..."
  done < "$ACTIVE_IDS_FILE"
else
  echo "Warning: active_ids.txt not found, skipping publish step."
fi

echo "Imported and activated workflows in: ${N8N_USER_FOLDER}"
