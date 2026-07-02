#!/usr/bin/env node
import { createServer } from "node:http";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const HOST = "127.0.0.1";
const PORT = 7431;

function saveCredentials(payload) {
  const dir = join(homedir(), ".selahkeep");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const target = join(dir, "mcp-credentials.json");
  writeFileSync(target, JSON.stringify(payload, null, 2), { mode: 0o600 });
  return target;
}

const server = createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/connect") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    try {
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      const path = saveCredentials(body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, path }));
    } catch (error) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : "invalid" }));
    }
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, HOST, () => {
  console.log(`SelahKeep bridge listening on http://${HOST}:${PORT}`);
});
