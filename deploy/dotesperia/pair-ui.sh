#!/bin/sh
# Run on the VM as the operator. Only the dedicated loopback API is contacted.
# A short-lived pairing code is printed; no account token is read or exported.
set -eu
set -a
. /opt/dotesperia/runtime.env
set +a
case "$OMB_PORT" in ''|*[!0-9]*) echo 'Invalid private port' >&2; exit 1;; esac
test "$OMB_PORT" -ge 10000 && test "$OMB_PORT" -le 65535
curl --noproxy '*' --fail --silent --show-error --max-time 15 \
  -H 'content-type: application/json' -X POST \
  --data '{"label":"Operator device","scopes":["admin"]}' \
  "http://127.0.0.1:$OMB_PORT/api/auth/pairing" | \
  /opt/dotesperia/node-v24.21.0-linux-x64/bin/node -e '
    let data = "";
    process.stdin.on("data", chunk => data += chunk);
    process.stdin.on("end", () => {
      const reply = JSON.parse(data);
      if (!reply.code || !reply.url) { console.error("Pairing unavailable"); process.exitCode = 1; return; }
      console.log(JSON.stringify({ url: reply.url, expiresAt: reply.expiresAt }));
    });'
