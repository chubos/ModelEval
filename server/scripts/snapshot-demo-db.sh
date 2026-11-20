#!/usr/bin/env bash
# Odświeża server/data/demo.sqlite z bieżącej lokalnej bazy (do commitowania).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/data/modeleval.sqlite"
DST="$ROOT/data/demo.sqlite"

if [[ ! -f "$SRC" ]]; then
  echo "Brak $SRC — uruchom najpierw serwer / zrób testy." >&2
  exit 1
fi

sqlite3 "$SRC" "PRAGMA wal_checkpoint(TRUNCATE);"
rm -f "$DST"
sqlite3 "$SRC" "VACUUM INTO '$DST';"
ls -lh "$DST"
sqlite3 "$DST" "SELECT 'pairs', COUNT(*) FROM arena_pairs UNION ALL SELECT 'judged', COUNT(*) FROM arena_pairs WHERE vote IS NOT NULL UNION ALL SELECT 'lb', COUNT(*) FROM leaderboard WHERE wins+losses+ties+both_bad>0;"
echo "Gotowe: $DST (możesz zacommitować)."
