#!/usr/bin/env bash
# Rebuild the Eleventy site after edits that can break the build.
# Scoped to templates, shortcode config, data, and ASCII art — CSS edits are
# passthrough-copied and can't fail the build, so they don't trigger a rebuild.
set -euo pipefail

for f in ${CLAUDE_FILE_PATHS:-}; do
  case "$f" in
    *.njk | .eleventy.js | src/_data/* | src/assets/ascii/*)
      npm run build
      exit
      ;;
  esac
done
