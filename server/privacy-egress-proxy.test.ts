import { once } from "node:events";
import { createServer, connect } from "node:net";
import { expect, it } from "vitest";
import { clientHelloName, createEgressProxy } from "./privacy-egress-proxy.ts";

function hello(name: string): Buffer {
  const hostname = Buffer.from(name);
  const sni = Buffer.alloc(5 + hostname.length);
  sni.writeUInt16BE(3 + hostname.length, 0); sni[2] = 0; sni.writeUInt16BE(hostname.length, 3); hostname.copy(sni, 5);
  const extensions = Buffer.alloc(4 + sni.length); extensions.writeUInt16BE(0, 0); extensions.writeUInt16BE(sni.length, 2); sni.copy(extensions, 4);
  const body = Buffer.alloc(2 + 32 + 1 + 2 + 2 + 1 + 1 + 2 + extensions.length);
  body.writeUInt16BE(0x0303); body[34] = 0; body.writeUInt16BE(2, 35); body.writeUInt16BE(0x1301, 37); body[39] = 1; body[40] = 0; body.writeUInt16BE(extensions.length, 41); extensions.copy(body, 43);
  const record = Buffer.alloc(9 + body.length); record[0] = 22; record.writeUInt16BE(0x0301, 1); record.writeUInt16BE(4 + body.length, 3); record[5] = 1; record.writeUIntBE(body.length, 6, 3); body.copy(record, 9);
  return record;
}

it("waits for a complete TLS record and refuses missing/malformed server names", () => {
  expect(clientHelloName(hello("chatgpt.com"))).toBe("chatgpt.com");
  expect(clientHelloName(hello("chatgpt.com").subarray(0, 12))).toBeNull();
  expect(() => clientHelloName(Buffer.from("GET / HTTP/1.1\r\n"))).toThrow();
  expect(() => clientHelloName(hello("evil name"))).toThrow();
});

it("refuses an unapproved CONNECT and a mismatched TLS name before contacting the target", async () => {
  let connections = 0;
  const target = createServer(socket => { connections++; socket.once("data", () => socket.end("accepted")); });
  target.listen(0, "127.0.0.1"); await once(target, "listening");
  const targetPort = (target.address() as { port: number }).port;
  const proxy = createEgressProxy([`https://localhost:${targetPort}`]);
  proxy.server.listen(0, "127.0.0.1"); await once(proxy.server, "listening");
  const port = (proxy.server.address() as { port: number }).port;
  const tunnel = async (destination: string, name?: string) => {
    const client = connect(port, "127.0.0.1"); await once(client, "connect");
    client.write(`CONNECT ${destination} HTTP/1.1\r\nHost: ${destination}\r\n\r\n`);
    const [response] = await once(client, "data") as [Buffer];
    if (name) client.write(hello(name));
    await once(client, "close");
    return response.toString();
  };
  try {
    expect(await tunnel("posthog.com:443")).toContain("403");
    await tunnel(`localhost:${targetPort}`, "posthog.com");
    expect(connections).toBe(0);
    // The owned target sees only the approved ClientHello.
    const client = connect(port, "127.0.0.1"); await once(client, "connect");
    client.write(`CONNECT localhost:${targetPort} HTTP/1.1\r\nHost: localhost:${targetPort}\r\n\r\n`);
    await once(client, "data"); client.write(hello("localhost"));
    const [data] = await once(client, "data") as [Buffer];
    expect(data.toString()).toBe("accepted"); client.destroy();
    expect(connections).toBe(1);
  } finally { await proxy.close(); await new Promise<void>(resolve => target.close(() => resolve())); }
});
