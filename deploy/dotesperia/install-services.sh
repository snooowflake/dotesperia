#!/bin/sh
# Run only after building the fork and installing the portable runtime as the
# operator. Privileges are used for accounts, units and the new UID's firewall;
# the agent and network relay run without privileges. Project files are never
# owned by root. Existing services, firewall tables and agent homes are untouched.
set -eu
operator=${1:-mono}
operator_group=$(id -gn "$operator")
base=/opt/dotesperia
test -d "$base/repo/dist"
test -x "$base/node-v24.21.0-linux-x64/bin/node"
test -x "$base/tooling/node_modules/.bin/codex"
if ! id dotesperia >/dev/null 2>&1; then useradd --create-home --shell /bin/bash dotesperia; fi
if ! id dotesperia-net >/dev/null 2>&1; then useradd --system --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin dotesperia-net; fi
test "$(getent passwd dotesperia | cut -d: -f6)" = /home/dotesperia
chmod 700 /home/dotesperia
install -d -o dotesperia -g dotesperia -m 700 /home/dotesperia/workspace /home/dotesperia/.dotesperia
credential_id=$($base/node-v24.21.0-linux-x64/bin/node -e 'process.stdout.write(require("node:crypto").createHash("sha256").update("codex").digest("hex"))')
credential_home="/home/dotesperia/.dotesperia/providers/codex/$credential_id"
install -d -o dotesperia -g dotesperia -m 700 /home/dotesperia/.dotesperia/providers /home/dotesperia/.dotesperia/providers/codex "$credential_home"
if test ! -f "$credential_home/config.toml"; then
  install -o dotesperia -g dotesperia -m 600 "$base/repo/deploy/dotesperia/codex-config.toml" "$credential_home/config.toml"
fi
if test ! -f /home/dotesperia/.dotesperia/config.json; then
  install -o dotesperia -g dotesperia -m 600 "$base/repo/deploy/dotesperia/config.example.json" /home/dotesperia/.dotesperia/config.json
fi
if test ! -f "$base/runtime.env"; then
  install -o "$operator" -g "$operator_group" -m 644 "$base/repo/deploy/dotesperia/runtime.env.example" "$base/runtime.env"
fi
for name in dotesperia dotesperia-web dotesperia-egress dotesperia-egress-policy; do
  target="/etc/systemd/system/$name.service"
  if test -e "$target" && ! grep -q /opt/dotesperia "$target"; then echo "Refusing to replace an unrelated unit: $name" >&2; exit 1; fi
  install -o "$operator" -g "$operator_group" -m 644 "$base/repo/deploy/dotesperia/$name.service" "$target"
done
systemctl daemon-reload
# Do not replace a live firewall while an agent is running.
systemctl stop dotesperia-web dotesperia || true
if nft list table inet dotesperia >/dev/null 2>&1; then nft delete table inet dotesperia; fi
systemctl restart dotesperia-egress-policy
systemctl enable dotesperia-egress-policy dotesperia-egress dotesperia dotesperia-web
for name in dotesperia dotesperia-web dotesperia-egress dotesperia-egress-policy; do
  link="/etc/systemd/system/multi-user.target.wants/$name.service"
  if test -L "$link"; then chown -h "$operator:$operator_group" "$link"; fi
done
echo 'Services installed. Add the operator-owned TLS certificate/config, then start dotesperia-web.'
