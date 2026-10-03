#!/bin/sh
set -eu
test "$(id -un)" = dotesperia || { echo 'Run this as dotesperia, never root.' >&2; exit 1; }
set -a
. /opt/dotesperia/runtime.env
set +a
credential_id=$(/opt/dotesperia/node-v24.21.0-linux-x64/bin/node -e 'process.stdout.write(require("node:crypto").createHash("sha256").update("codex").digest("hex"))')
export CODEX_HOME="$OMB_DATA_DIR/providers/codex/$credential_id"
mkdir -p "$CODEX_HOME"
chmod 700 "$CODEX_HOME"
umask 077
if test ! -f "$CODEX_HOME/config.toml"; then
  cat > "$CODEX_HOME/config.toml" <<'EOF'
model = "gpt-6-astra"
approval_policy = "on-request"
sandbox_mode = "workspace-write"
web_search = "disabled"
[analytics]
enabled = false
[feedback]
enabled = false
[otel]
exporter = "none"
trace_exporter = "none"
metrics_exporter = "none"
log_user_prompt = false
EOF
fi
exec /opt/dotesperia/tooling/node_modules/.bin/codex login --device-auth
