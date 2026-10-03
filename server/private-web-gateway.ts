// Own TLS endpoint for a VPN/LAN. No hosted tunnel, CDN or remote certificate
// service. The operator supplies a locally generated certificate and key.
import { createServer } from "node:https";
import { request } from "node:http";
import { readFileSync } from "node:fs";
import { connect } from "node:net";

const port = Number(process.env.DOTESPERIA_UI_PORT || 18898);
const appPort = Number(process.env.OMB_PORT || 18899);
const bind = process.env.DOTESPERIA_UI_BIND || "127.0.0.1";
const key = process.env.DOTESPERIA_TLS_KEY;
const cert = process.env.DOTESPERIA_TLS_CERT;
if (!key || !cert) throw new Error("Provide an owner-managed TLS certificate and key.");
function headersFor(req: import("node:http").IncomingMessage): import("node:http").IncomingHttpHeaders {
  const headers: import("node:http").IncomingHttpHeaders = { ...req.headers, "x-forwarded-for": req.socket.remoteAddress || "", "x-forwarded-proto": "https" };
  delete headers["forwarded"]; delete headers["proxy-authorization"];
  return headers;
}
const server = createServer({ key: readFileSync(key), cert: readFileSync(cert) }, (req, res) => {
  const upstream = request({ host: "127.0.0.1", port: appPort, path: req.url, method: req.method, headers: headersFor(req) }, reply => {
    res.writeHead(reply.statusCode || 502, reply.headers); reply.pipe(res);
  });
  upstream.on("error", () => { if (!res.headersSent) res.writeHead(502); res.end(); });
  req.once("aborted", () => upstream.destroy());
  res.once("close", () => upstream.destroy());
  req.pipe(upstream);
});
server.on("upgrade", (req, client, head) => {
  const upstream = connect(appPort, "127.0.0.1", () => {
    const headers = headersFor(req);
    const lines = Object.entries(headers).flatMap(([key, value]) => value === undefined ? [] : [`${key}: ${Array.isArray(value) ? value.join(", ") : value}`]);
    upstream.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n${lines.join("\r\n")}\r\n\r\n`);
    if (head.length) upstream.write(head);
    client.pipe(upstream); upstream.pipe(client);
  });
  upstream.on("error", () => client.destroy()); client.on("error", () => upstream.destroy()); client.once("close", () => upstream.destroy());
});
server.listen(port, bind, () => console.log("Dotesperia private HTTPS interface ready."));
process.once("SIGTERM", () => server.close());
