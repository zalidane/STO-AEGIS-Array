#!/usr/bin/env bash
# Per-boot startup for STO AEGIS Array: bring PostgreSQL online.
# Idempotent and safe to run on every environment start. Dev servers run as
# named terminals; this script only reconciles the database service.
set -euo pipefail

echo "==> Starting PostgreSQL cluster"
sudo pg_ctlcluster 16 main start 2>/dev/null || true

for _ in $(seq 1 30); do
  if sudo -u postgres pg_isready -q; then
    echo "==> PostgreSQL is accepting connections"
    exit 0
  fi
  sleep 1
done

echo "!! PostgreSQL did not become ready in time" >&2
exit 1
