#!/usr/bin/env bash
# Idempotent repository bootstrap for STO AEGIS Array.
# Installs PostgreSQL, prepares the database, installs deps, runs migrations,
# and seeds the DB from committed Extractor JSON. Safe to run repeatedly.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "==> Ensuring PostgreSQL is installed"
if ! command -v pg_ctlcluster >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql postgresql-contrib
fi

echo "==> Starting PostgreSQL cluster (needed to prepare the DB)"
sudo pg_ctlcluster 16 main start 2>/dev/null || true
for _ in $(seq 1 30); do
  if sudo -u postgres pg_isready -q; then break; fi
  sleep 1
done

echo "==> Ensuring role and database exist"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='sto'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE sto WITH LOGIN PASSWORD 'sto' CREATEDB;"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='sto_aegis'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE sto_aegis OWNER sto;"

echo "==> Writing .env if missing"
if [ ! -f .env ]; then
  cat > .env <<'EOF'
# Local database (Prisma)
DATABASE_URL="postgresql://sto:sto@localhost:5432/sto_aegis"

# STOWiki extract — identifies this client to wiki admins
STOWIKI_CONTACT="cloud-agent@example.com"
EOF
fi

echo "==> Installing npm dependencies"
npm install

echo "==> Generating Prisma client and applying migrations"
npm run db:generate
npm run db:migrate

echo "==> Seeding database from committed Extractor JSON (if empty)"
SHIP_COUNT="$(PGPASSWORD=sto psql -h localhost -U sto -d sto_aegis -tAc 'SELECT count(*) FROM "Ship"' 2>/dev/null || echo 0)"
if [ "${SHIP_COUNT:-0}" -lt 1 ]; then
  npm run import
else
  echo "    Ship table already has ${SHIP_COUNT} rows; skipping import."
fi

echo "==> install.sh complete"
