#!/bin/sh
set -eu
test "$(id -u)" != 0
export DISPLAY=${DOTESPERIA_DISPLAY:-:91}
export XAUTHORITY="$HOME/.Xauthority"
export XDG_RUNTIME_DIR=${XDG_RUNTIME_DIR:-/run/dotesperia-desktop}
mkdir -p "$HOME/workspace" "$HOME/.config/openbox"
umask 077
touch "$XAUTHORITY"
xauth -f "$XAUTHORITY" add "$DISPLAY" MIT-MAGIC-COOKIE-1 "$(python3 -c 'import secrets;print(secrets.token_hex(16))')"
# This private X server never listens on a network socket.
Xvfb "$DISPLAY" -screen 0 1280x800x24 -nolisten tcp -auth "$XAUTHORITY" -noreset &
xpid=$!
cleanup() { kill "$xpid" ${opid:-} ${vpid:-} ${wpid:-} ${mpid:-} 2>/dev/null || true; }
trap cleanup EXIT HUP INT TERM
i=0
while ! xdpyinfo >/dev/null 2>&1; do
  i=$((i+1)); test "$i" -lt 30; sleep 0.2
done
openbox & opid=$!
x11vnc -display "$DISPLAY" -auth "$XAUTHORITY" -localhost -rfbport "${DOTESPERIA_RFB_PORT:-5905}" -forever -shared -nopw -quiet & vpid=$!
websockify "127.0.0.1:${DOTESPERIA_DESKTOP_VIEWER_PORT:-18903}" "127.0.0.1:${DOTESPERIA_RFB_PORT:-5905}" & wpid=$!
"$DOTESPERIA_CUA_DRIVER" telemetry disable >/dev/null
"$DOTESPERIA_CUA_DRIVER" telemetry reset-id >/dev/null
cd "$HOME/workspace"
if command -v mousepad >/dev/null; then
  mousepad &
else
  xterm -title 'DOTesperia — bureau privé' &
fi
"${DOTESPERIA_NODE:-/opt/dotesperia/node-v24.21.0-linux-x64/bin/node}" --experimental-strip-types "${DOTESPERIA_DESKTOP_SERVICE:-/opt/dotesperia/repo/server/private-desktop-service.ts}" & mpid=$!
# Losing X11, VNC, the socket bridge or the MCP child restarts the whole
# private session. systemd reaps remaining children as one cgroup.
while kill -0 "$xpid" "$opid" "$vpid" "$wpid" "$mpid" 2>/dev/null; do sleep 2; done
exit 1
