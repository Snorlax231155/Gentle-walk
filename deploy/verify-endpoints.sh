#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-}"

if [ -z "$BASE_URL" ]; then
  echo "Usage: $0 <BASE_URL> (e.g. https://gentle-walk-xxx.ap-south-1.elb.amazonaws.com)"
  exit 1
fi

# Trim trailing slash if present
BASE_URL="${BASE_URL%/}"

echo "=========================================================="
echo " Verifying Deployed Gentle Walk Service at: ${BASE_URL}"
echo "=========================================================="

echo -e "\n1. Testing GET /api/health..."
HEALTH_RESP=$(curl -s -w "\nHTTP_STATUS:%{http_code}\nTIME_TOTAL:%{time_total}s\n" "${BASE_URL}/api/health")
echo "${HEALTH_RESP}"
if ! echo "${HEALTH_RESP}" | grep -q '"status":"UP"'; then
  echo "ERROR: /api/health did not return UP status!"
  exit 1
fi

echo -e "\n2. Testing GET /api/window?demo=true..."
WINDOW_RESP=$(curl -s -w "\nHTTP_STATUS:%{http_code}\nTIME_TOTAL:%{time_total}s\n" "${BASE_URL}/api/window?demo=true")
echo "${WINDOW_RESP}" | head -n 15
if ! echo "${WINDOW_RESP}" | grep -q '"mode":"demo"'; then
  echo "ERROR: /api/window?demo=true did not return mode=demo!"
  exit 1
fi

echo -e "\n3. Testing POST /api/plan with demo=true..."
PLAN_RESP=$(curl -s -w "\nHTTP_STATUS:%{http_code}\nTIME_TOTAL:%{time_total}s\n" \
  -H "Content-Type: application/json" \
  -d '{"lat":28.6139,"lon":77.2090,"radiusM":800,"minutes":20,"sensitivity":"NORMAL","demo":true}' \
  "${BASE_URL}/api/plan")
echo "${PLAN_RESP}" | head -n 20
if ! echo "${PLAN_RESP}" | grep -q '"mode":"demo"'; then
  echo "ERROR: /api/plan with demo=true did not return mode=demo!"
  exit 1
fi

echo -e "\n4. Testing GET / (Frontend PWA UI)..."
UI_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/")
echo "UI HTTP Status: ${UI_STATUS}"
if [ "${UI_STATUS}" -ne 200 ]; then
  echo "ERROR: Root path / did not return HTTP 200!"
  exit 1
fi

echo -e "\n=========================================================="
echo " ALL ENDPOINTS VERIFIED SUCCESSFULLY!"
echo "=========================================================="
