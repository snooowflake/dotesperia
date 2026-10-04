#!/bin/sh
# Operator installation on the audit VM. Existing Hermes and other services
# are outside this script's paths and commands. No external installer is run.
set -eu
test "$(id -u)" = 0
test "$(hostname)" = OpenCode
base=/opt/dotesperia
repo=$base/repo
test -d "$repo/.git"
test -f "$base/runtime.env"
test -x "$repo/dist-native/cua-linux-x64/cua-driver"
test -f "$repo/server/private-desktop-service.ts"
id mono >/dev/null
id dotesperia >/dev/null
id dotesperia-desktop >/dev/null 2>&1 || useradd --system --create-home --home-dir /home/dotesperia-desktop --shell /usr/sbin/nologin dotesperia-desktop
for program in Xvfb openbox x11vnc websockify mousepad xauth dbus-run-session nft; do command -v "$program" >/dev/null; done
install -d -o mono -g mono -m 0755 "$base/desktop"
install -d -o dotesperia-desktop -g dotesperia-desktop -m 0700 /home/dotesperia-desktop
python3 - <<'PY'
import json, os, re, secrets, shutil
from pathlib import Path

def save(path, text, user, group=None, mode=0o600):
    path.write_text(text)
    shutil.chown(path, user=user, group=group or user)
    path.chmod(mode)

base = Path('/opt/dotesperia')
desktop_env = base/'desktop/runtime.env'
previous = dict(line.split('=',1) for line in desktop_env.read_text().splitlines() if '=' in line) if desktop_env.exists() else {}
token = previous.get('DOTESPERIA_DESKTOP_TOKEN') or secrets.token_hex(32)
assert re.fullmatch('[a-f0-9]{64}', token)
save(desktop_env, '\n'.join([
    'HOME=/home/dotesperia-desktop', 'DOTESPERIA_DISPLAY=:91', 'DOTESPERIA_RFB_PORT=5905',
    'DOTESPERIA_DESKTOP_PORT=18902', 'DOTESPERIA_DESKTOP_VIEWER_PORT=18903',
    'DOTESPERIA_DESKTOP_TOKEN='+token,
    'DOTESPERIA_CUA_DRIVER=/opt/dotesperia/repo/dist-native/cua-linux-x64/cua-driver',
    'PATH=/opt/dotesperia/node-v24.21.0-linux-x64/bin:/usr/bin:/bin',
    'HTTPS_PROXY=http://127.0.0.1:18081', 'HTTP_PROXY=http://127.0.0.1:18081',
    'ALL_PROXY=http://127.0.0.1:18081', 'NO_PROXY=127.0.0.1,localhost',
    'NODE_USE_ENV_PROXY=1', 'XDG_RUNTIME_DIR=/run/dotesperia-desktop',
])+'\n', 'mono')
runtime = base/'runtime.env'
backup = base/'desktop/runtime.before-desktop.env'
if not backup.exists(): save(backup, runtime.read_text(), 'mono')
lines = [line for line in runtime.read_text().splitlines() if not line.startswith(('DOTESPERIA_DESKTOP_URL=', 'DOTESPERIA_DESKTOP_TOKEN=', 'DOTESPERIA_DESKTOP_VIEWER_PORT='))]
save(runtime, '\n'.join(lines+['DOTESPERIA_DESKTOP_URL=http://127.0.0.1:18902', 'DOTESPERIA_DESKTOP_TOKEN='+token, 'DOTESPERIA_DESKTOP_VIEWER_PORT=18903'])+'\n', 'mono')
config_path = Path('/home/dotesperia/.dotesperia/config.json')
config_backup = config_path.with_name('config.before-desktop.json')
if not config_backup.exists(): save(config_backup, config_path.read_text(), 'dotesperia')
config = json.loads(config_path.read_text())
config.setdefault('mcpServers', {})['private_desktop'] = {
    'type':'http', 'url':'http://127.0.0.1:18902/mcp', 'enabled':True,
    'headers':{'authorization':'Bearer '+token},
}
save(config_path, json.dumps(config, indent=2)+'\n', 'dotesperia')
print('Private desktop configuration written; credentials retained locally.')
PY
install -o mono -g mono -m 0644 "$repo/deploy/dotesperia/dotesperia-desktop-policy.service" /etc/systemd/system/dotesperia-desktop-policy.service
install -o mono -g mono -m 0644 "$repo/deploy/dotesperia/dotesperia-desktop.service" /etc/systemd/system/dotesperia-desktop.service
nft -c -f "$repo/deploy/dotesperia/desktop-egress.nft"
systemctl stop dotesperia-desktop-validation.service 2>/dev/null || true
systemctl daemon-reload
systemctl enable dotesperia-desktop-policy.service dotesperia-desktop.service
chown -h mono:mono /etc/systemd/system/multi-user.target.wants/dotesperia-desktop-policy.service /etc/systemd/system/multi-user.target.wants/dotesperia-desktop.service
systemctl restart dotesperia-desktop-policy.service
systemctl restart dotesperia-desktop.service
# The app is restarted separately once the operator has confirmed it is idle.
