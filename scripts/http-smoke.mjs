import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const port = 3197;
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ["dist/server.cjs"], {
  env: { ...process.env, NODE_ENV: "production", PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"],
});

let serverOutput = "";
child.stdout.on("data", chunk => { serverOutput += chunk.toString(); });
child.stderr.on("data", chunk => { serverOutput += chunk.toString(); });

async function waitForServer() {
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${base}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error(`Production server did not start.\n${serverOutput}`);
}

async function verify(path, contentType) {
  const response = await fetch(`${base}${path}`);
  assert.equal(response.status, 200, `${path} status`);
  assert.match(response.headers.get("content-type") ?? "", contentType, `${path} content type`);
  return response;
}

try {
  await waitForServer();
  const health = await (await verify("/api/health", /json/)).json();
  assert.equal(health.ok, true);
  assert.equal(health.version, "0.21.0");
  const html = await (await verify("/", /html/)).text();
  assert.match(html, /manifest\.webmanifest/);
  const manifest = await (await verify("/manifest.webmanifest", /manifest|json/)).json();
  assert.equal(manifest.short_name, "CMYS Fight");
  const sw = await (await verify("/sw.js", /javascript/)).text();
  assert.match(sw, /CACHE_NAME/);
  const musicConfig = await (await verify("/music-tracks.json", /json/)).json();
  assert.equal(typeof musicConfig.attribution, "string");
  const icon192 = await verify("/icon-192.png", /image\/png/);
  const icon512 = await verify("/icon-512.png", /image\/png/);
  assert.ok((await icon192.arrayBuffer()).byteLength > 100);
  assert.ok((await icon512.arrayBuffer()).byteLength > 100);
  console.log(JSON.stringify({ httpServer: "ok", pwaRoutes: "ok", health: "ok" }));
} finally {
  child.kill("SIGTERM");
  await Promise.race([
    new Promise(resolve => child.once("exit", resolve)),
    new Promise(resolve => setTimeout(resolve, 2000)),
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}
