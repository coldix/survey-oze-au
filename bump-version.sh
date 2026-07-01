#!/bin/bash
# Bump semver across survey.oze.au source files.
# Usage: ./bump-version.sh 1.0.3
set -euo pipefail
NEW="${1:?Usage: ./bump-version.sh X.Y.Z}"
DATE="$(TZ=Australia/Sydney date '+%-d %b %Y | %-I:%M %p AEST')"
DATE_SHORT="$(TZ=Australia/Sydney date '+%-d %b %Y')"
ROOT="$(cd "$(dirname "$0")" && pwd)"

replace_in() {
  local f="$1"
  [[ -f "$f" ]] || return 0
  sed -i '' \
    -e "s/Version: [0-9][0-9.]*$/Version: $NEW/" \
    -e "s/Date: .* AEST$/Date: $DATE/" \
    -e "s/· v[0-9][0-9.]* ·/· v$NEW ·/g" \
    -e "s/const VERSION = '[^']*'/const VERSION = '$NEW'/" \
    "$f"
}

replace_in "$ROOT/money/index.html"
replace_in "$ROOT/index.html"
replace_in "$ROOT/README.md"
echo "Bumped to v$NEW ($DATE)"