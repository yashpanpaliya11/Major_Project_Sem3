#!/usr/bin/env bash
# Full end-to-end verify: a self-contained server + smoke test in ONE command.
# The tool host kills background processes at the end of each command, so the
# server + test must run in the same command.
set -uo pipefail

cd /Users/ashmitsahu/Desktop/major_project/server

# Kill any existing server on port 5001 (before this script is even run)
if command -v lsof >/dev/null 2>&1; then
  lsof -ti tcp:5001 2>/dev/null | xargs -r kill 2>/dev/null || true
fi
sleep 1

NODE_ENV=production \
JWT_SECRET='Smoke-Session-5x1s-x88AA-6f3F-9c2D-4a7B-0E8C-2d5F' \
PUBLIC_URL='http://localhost:5001' \
SERVE_CLIENT=true \
PORT=5001 \
node src/index.js > /tmp/edupulse-verify-server.log 2>&1 &
SRV=$!

# Wait for the API to answer (max 40s)
READY=0
for i in $(seq 1 40); do
  if curl -sf http://localhost:5001/api/health >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 1
done

if [ "$READY" -ne 1 ]; then
  echo "=== SERVER LOG ==="
  cat /tmp/edupulse-verify-server.log
  echo "=== SERVER DID NOT START ==="
  kill $SRV 2>/dev/null || true
  wait $SRV 2>/dev/null || true
  exit 1
fi

echo "=== Server is up (health endpoint responded). Running smoke test ==="

# Run the smoke test — capture the FULL console output (not just the test harness summary)
NODE_ENV=production node scripts/smoke-test.mjs > /tmp/smoke-test-console.txt 2>&1
TEST_STATUS=$?

echo "=== === === === === === === === === === === === === === === === === ==="
echo "=== SMOKE TEST CONSOLE OUTPUT ==="
echo "=== === === === === === === === === === === === === === === === === ==="
cat /tmp/smoke-test-console.txt

echo "=== === === === === === === === === === === === === === === === === ==="
echo "=== SMOKE TEST EXIT CODE: $TEST_STATUS ==="
echo "=== === === === === === === === === === === === === === === === === ==="

# Also print any auth-check lines explicitly, so even if the test runner
# buffers them, we can confirm the auth flow works.
echo
echo "=== AUTH-SPECIFIC CHECKS (from console) ==="
grep -E "admin login|faculty login|student login|wrong password|student blocked|admin registration|short password|health endpoint|login ->" /tmp/smoke-test-console.txt || echo "(no auth-check lines found in console)"

echo
echo "=== SERVER LOG (background) ==="
cat /tmp/edupulse-verify-server.log

# Tear down
kill $SRV 2>/dev/null || true
wait $SRV 2>/dev/null || true

exit $TEST_STATUS
