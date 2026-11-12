#!/usr/bin/env bash
set -euo pipefail

cd /Users/ashmitsahu/Desktop/major_project/server

# Kill any existing server on port 5001
if command -v lsof >/dev/null 2>&1; then
  lsof -ti tcp:5001 2>/dev/null | xargs -r kill 2>/dev/null || true
elif command -v fuser >/dev/null 2>&1; then
  fuser -k 5001/tcp 2>/dev/null || true
fi
sleep 2

NODE_ENV=production \
JWT_SECRET='Smoke-Session-5x1s-x88AA-6f3F-9c2D-4a7B-0E8C-2d5F' \
PUBLIC_URL='http://localhost:5001' \
SERVE_CLIENT=true \
PORT=5001 \
node src/index.js > /tmp/edupulse-smoke-server.log 2>&1 &
SRV=$!

# Wait for the API to answer
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
  cat /tmp/edupulse-smoke-server.log
  echo "=== SERVER DID NOT START ==="
  kill $SRV 2>/dev/null || true
  exit 1
fi

echo "=== Server is up, running smoke test ==="
NODE_ENV=production node scripts/smoke-test.mjs > /tmp/smoke-test-console.txt 2>&1
TEST_STATUS=$?
cat /tmp/smoke-test-console.txt
TEST_STATUS=$?
echo "=== Smoke test console exit code: $TEST_STATUS ==="
echo "=== Test exit code: $TEST_STATUS ==="

echo "=== Server log ==="
cat /tmp/edupulse-smoke-server.log
kill $SRV 2>/dev/null || true
wait $SRV 2>/dev/null || true
exit $TEST_STATUS
