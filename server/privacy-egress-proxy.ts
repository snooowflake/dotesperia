// A local CONNECT proxy, running under an identity the agent cannot modify.
// Payloads stay encrypted; only the initial TLS name is checked. No request,
// token, conversation or browsing history is written to a log.
import { createServer, request } from "node:http";
import { connect, isIP, type Socket } from "node:net";
import { pathToFileURL } from "node:url";
import { createPrivacyPolicy, ownerOrigins, PrivacyRefusal } from "./privacy-policy.ts";

/** RFC 6066 server_name in a TLS ClientHello. An incomplete TCP packet waits;
 * malformed, fragmented TLS records and missing/hidden names fail closed. */
export function clientHelloName(bytes: Buffer, allowMissing = false): string | null {
  if (bytes.length < 5) return null;
  if (bytes[0] !== 22 || bytes[1] !== 3) throw new PrivacyRefusal();
  const length = bytes.readUInt16BE(3);
  if (length > 16_384) throw new PrivacyRefusal();
  if (bytes.length < 5 + length) return null;
  const data = bytes.subarray(5, 5 + length);
  try {
    if (data[0] !== 1 || data.readUIntBE(1, 3) !== data.length - 4) throw new PrivacyRefusal();
    let at = 38; // handshake header + version + random
    at += 1 + data[at];
    at += 2 + data.readUInt16BE(at);
    at += 1 + data[at];
    const end = at + 2 + data.readUInt16BE(at);
    at += 2;
    if (end !== data.length) throw new PrivacyRefusal();
    let name: string | undefined;
    while (at < end) {
      const kind = data.readUInt16BE(at);
      const size = data.readUInt16BE(at + 2);
      at += 4;
      if (at + size > end) throw new PrivacyRefusal();
      if (kind === 0) {
        if (name !== undefined || size < 5 || data.readUInt16BE(at) !== size - 2 || data[at + 2] !== 0 || data.readUInt16BE(at + 3) !== size - 5) throw new PrivacyRefusal();
        name = data.subarray(at + 5, at + size).toString("ascii").toLowerCase();
        if (!/^[a-z0-9.-]+$/.test(name)) throw new PrivacyRefusal();
      }
      at += size;
    }
    if (!name && !allowMissing) throw new PrivacyRefusal();
    return name || "";
  } catch { throw new PrivacyRefusal(); }
}

export function createEgressProxy(owners: readonly string[] = []) {
  const policy = createPrivacyPolicy(owners);
  const sockets = new Set<Socket>();
  const server = createServer((req, res) => {
    // Plain HTTP is reserved for explicit owner-hosted services, never the
    // model. This keeps private LAN APIs usable without granting a subnet.
    if (req.url?.startsWith("http://")) {
      let target: URL;
      try {
        target = new URL(req.url); policy.assertUrl(target);
        if (!owners.includes(target.origin)) throw new PrivacyRefusal();
      } catch { res.writeHead(403); res.end(); return; }
      const headers: import("node:http").IncomingHttpHeaders = { ...req.headers, host: target.host };
      delete headers["proxy-authorization"]; delete headers["proxy-connection"];
      const upstream = request({ hostname: target.hostname, port: target.port || 80, path: target.pathname + target.search, method: req.method, headers, timeout: 30_000 }, reply => {
        res.writeHead(reply.statusCode || 502, reply.headers); reply.pipe(res);
      });
      upstream.on("error", () => { if (!res.headersSent) res.writeHead(502); res.end(); });
      upstream.on("timeout", () => upstream.destroy());
      req.once("aborted", () => upstream.destroy()); res.once("close", () => upstream.destroy());
      req.pipe(upstream); return;
    }
    res.writeHead(req.url === "/health" && req.method === "GET" ? 200 : 403, { "content-type": "application/json" });
    res.end(JSON.stringify(req.url === "/health" ? { ok: true } : { error: "Only approved TLS tunnels are supported." }));
  });
  server.on("connection", socket => { sockets.add(socket); socket.once("close", () => sockets.delete(socket)); });
  server.on("connect", (req, stream, head) => {
    const client = stream as Socket;
    let url: URL;
    try {
      url = new URL(`https://${req.url}`);
      if (url.pathname !== "/" || url.search || url.hash || !req.url?.includes(":")) throw new PrivacyRefusal();
      policy.assertUrl(url);
    } catch { client.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n"); return; }
    // Wait for and validate the actual TLS name before opening any connection.
    // A CDN shared IP must not turn an allowed CONNECT hostname into a relay.
    client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    let buffered = head;
    let upstream: Socket | undefined;
    client.setTimeout(10_000, () => client.destroy());
    const inspect = (chunk: Buffer) => {
      buffered = Buffer.concat([buffered, chunk]);
      if (buffered.length > 32_768) { client.destroy(); return; }
      let name: string | null;
      try { name = clientHelloName(buffered, isIP(url.hostname) !== 0); } catch { client.destroy(); return; }
      if (name === null) return;
      if (name !== url.hostname.toLowerCase() && !(name === "" && isIP(url.hostname) !== 0)) { client.destroy(); return; }
      client.pause(); client.off("data", inspect); client.setTimeout(0);
      upstream = connect({ host: url.hostname, port: Number(url.port || 443), timeout: 10_000 });
      upstream.once("connect", () => {
        upstream!.setTimeout(0);
        upstream!.write(buffered);
        client.pipe(upstream!); upstream!.pipe(client); client.resume();
      });
      upstream.on("timeout", () => upstream?.destroy());
      upstream.on("error", () => client.destroy());
      upstream.on("close", () => client.destroy());
    };
    client.on("data", inspect);
    client.on("error", () => upstream?.destroy());
    client.on("close", () => upstream?.destroy());
    if (head.length) { buffered = Buffer.alloc(0); inspect(head); }
  });
  return { server, close: async () => { for (const socket of sockets) socket.destroy(); await new Promise<void>(resolve => server.close(() => resolve())); } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const proxy = createEgressProxy(ownerOrigins(process.env.DOTESPERIA_OWNER_ORIGINS));
  proxy.server.listen(Number(process.env.DOTESPERIA_PROXY_PORT || 18081), "127.0.0.1", () => console.log("Dotesperia egress proxy ready (loopback only)."));
  process.once("SIGTERM", () => { void proxy.close(); });
  process.once("SIGINT", () => { void proxy.close(); });
}
