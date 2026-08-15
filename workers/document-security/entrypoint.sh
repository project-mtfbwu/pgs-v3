#!/bin/sh
set -eu

# The official image's /init starts clamd and freshclam when invoked without
# a command. Run it alongside the PGS worker; passing node as /init's command
# would intentionally disable both daemons.
/init &
clamav_init_pid=$!

shutdown() {
  kill "$clamav_init_pid" 2>/dev/null || true
}
trap shutdown EXIT INT TERM

timeout="${CLAMD_STARTUP_TIMEOUT:-1800}"
elapsed=0
while [ ! -S /tmp/clamd.sock ] && [ ! -S /run/clamav/clamd.sock ]; do
  if [ "$elapsed" -ge "$timeout" ]; then
    echo "clamd did not become ready; worker remains fail-closed" >&2
    exit 1
  fi
  sleep 1
  elapsed=$((elapsed + 1))
done

node /worker/src/worker.mjs
