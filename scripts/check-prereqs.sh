#!/usr/bin/env bash
# Fails early, with a clear message, when the machine can't run `make setup`.
set -euo pipefail

node_major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [[ "$node_major" != "24" ]]; then
  echo "Node 24 is required (found $(node -v 2>/dev/null || echo none))." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker isn't running. Start Docker Desktop and try again." >&2
  exit 1
fi
