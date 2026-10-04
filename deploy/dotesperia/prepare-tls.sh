#!/bin/sh
# Run as the non-root operator. The authority can certify only this private
# endpoint and localhost; its private key is never readable by the runtime.
set -eu
test "$(id -u)" -ne 0 || { echo 'Run as the non-root operator' >&2; exit 1; }
tls=/opt/dotesperia/tls
umask 077
mkdir -p "$tls"
if [ ! -f "$tls/authority.crt" ]; then
  openssl req -x509 -newkey rsa:3072 -nodes -sha256 -days 1825 \
    -subj '/CN=Dotesperia private authority' \
    -addext 'basicConstraints=critical,CA:TRUE,pathlen:0' \
    -addext 'keyUsage=critical,keyCertSign,cRLSign' \
    -addext 'extendedKeyUsage=serverAuth' \
    -addext 'nameConstraints=critical,permitted;IP:10.70.0.10/255.255.255.255,permitted;IP:127.0.0.1/255.255.255.255,permitted;DNS:localhost' \
    -keyout "$tls/authority.key" -out "$tls/authority.crt" 2>/dev/null
fi
stage=$(mktemp -d "$tls/issue.XXXXXX")
trap 'rm -f "$stage/leaf.key" "$stage/leaf.csr" "$stage/leaf.crt" "$stage/extensions"; rmdir "$stage"' EXIT
openssl req -new -newkey rsa:3072 -nodes -sha256 -subj '/CN=Dotesperia' \
  -keyout "$stage/leaf.key" -out "$stage/leaf.csr" 2>/dev/null
cat > "$stage/extensions" <<'EOF'
basicConstraints=critical,CA:FALSE
keyUsage=critical,digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
subjectAltName=IP:10.70.0.10,IP:127.0.0.1,DNS:localhost
subjectKeyIdentifier=hash
authorityKeyIdentifier=keyid,issuer
EOF
openssl x509 -req -sha256 -days 365 -in "$stage/leaf.csr" \
  -CA "$tls/authority.crt" -CAkey "$tls/authority.key" \
  -set_serial "0x$(openssl rand -hex 16)" -extfile "$stage/extensions" \
  -out "$stage/leaf.crt" 2>/dev/null
openssl verify -CAfile "$tls/authority.crt" -verify_ip 10.70.0.10 "$stage/leaf.crt"
if [ -f "$tls/ui.crt" ]; then cp -p "$tls/ui.crt" "$tls/ui.crt.previous"; fi
if [ -f "$tls/ui.key" ]; then cp -p "$tls/ui.key" "$tls/ui.key.previous"; fi
# The administrator prepares this directory with group dotesperia-net and
# its setgid bit, so new server files inherit that group without sudo.
[ "$(stat -c %G "$stage/leaf.key")" = dotesperia-net ] || { echo 'Prepare the TLS directory with group dotesperia-net and mode 2750 first' >&2; exit 1; }
chmod 640 "$stage/leaf.key" "$stage/leaf.crt" "$tls/authority.crt"
chmod 600 "$tls/authority.key"
mv "$stage/leaf.key" "$tls/ui.key"
mv "$stage/leaf.crt" "$tls/ui.crt"
openssl x509 -in "$tls/authority.crt" -noout -fingerprint -sha256
echo 'Certificate prepared. Restart only dotesperia-web.service to load it.'
