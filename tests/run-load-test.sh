#!/bin/bash

LOAD_TEST_DIR="$(dirname "$0")/load-test"
REPORTS_DIR="$(dirname "$0")/load-test/reports"

mkdir -p "$REPORTS_DIR"

for test_file in "$LOAD_TEST_DIR"/*.js; do
  test_name=$(basename "$test_file" .js)
  echo "Running: $test_name"

  K6_WEB_DASHBOARD_EXPORT="$REPORTS_DIR/${test_name}-report.html" \
  k6 run \
    --out web-dashboard \
    "$test_file"

  echo "Report saved: $REPORTS_DIR/${test_name}-report.html"
  echo "---"
done

echo "All tests done. Reports saved to $REPORTS_DIR"