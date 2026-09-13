#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ ! -f src/app/production-ui.css ]; then
  echo 'production-ui.css is missing; pull the repository again.' >&2
  exit 1
fi

echo 'Premium UI is already tracked in src/app/production-ui.css.'
echo 'No generated overlay is needed.'
