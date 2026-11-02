#!/usr/bin/env bash
# Runs a command with the local Supabase connection details in its environment.
# They come from the running stack (`supabase status`), so nothing is hard-coded or written to disk.
set -euo pipefail
cd "$(dirname "$0")/.."

if ! status_json="$(npx --no-install supabase status -o json 2>/dev/null)"; then
  echo "Local Supabase is not running. Run 'make setup' (first time) or 'npx supabase start'." >&2
  exit 1
fi

read_status() {
  node -e 'const s = JSON.parse(process.argv[1]); process.stdout.write(s[process.argv[2]] ?? "")' "$status_json" "$1"
}

api_url="$(read_status API_URL)"
export SUPABASE_URL="$api_url"
export SUPABASE_PUBLISHABLE_KEY="$(read_status PUBLISHABLE_KEY)"
export SUPABASE_SECRET_KEY="$(read_status SECRET_KEY)"
export SUPABASE_DB_URL="$(read_status DB_URL)"
# The browser reaches Supabase Auth through this app's own origin (see next.config.ts), so only
# the publishable key is needed client-side. It is public by design; the secret key never is.
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$SUPABASE_PUBLISHABLE_KEY"

exec "$@"
