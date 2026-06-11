#!/usr/bin/env node
import { mkdirSync, writeFileSync, existsSync, renameSync, readdirSync } from "fs";
import { dirname, join } from "path";

const root = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

function shimContent(toPath) {
  const moduleImport = `@/${toPath.replace(/^src\//, "").replace(/\.tsx?$/, "")}`;
  return `/** @deprecated Import from "${moduleImport}" — Phase 1 modular monolith shim */\nexport * from "${moduleImport}";\n`;
}

function moveFile(from, to) {
  const fromAbs = join(root, from);
  const toAbs = join(root, to);
  if (!existsSync(fromAbs)) return;
  if (existsSync(toAbs)) return;
  mkdirSync(dirname(toAbs), { recursive: true });
  renameSync(fromAbs, toAbs);
  writeFileSync(fromAbs, shimContent(to));
  console.log(`moved ${from} -> ${to}`);
}

// UI components
for (const file of readdirSync(join(root, "src/components/ui"))) {
  if (!file.endsWith(".tsx")) continue;
  moveFile(`src/components/ui/${file}`, `src/modules/ui/components/${file}`);
}

// UI lib helpers
for (const file of ["cn.ts", "brand-mark.ts", "main-content.ts"]) {
  moveFile(`src/lib/ui/${file}`, `src/modules/ui/lib/${file}`);
}

// crypto-client -> vault
for (const file of readdirSync(join(root, "src/lib/crypto-client"))) {
  if (!file.endsWith(".ts")) continue;
  moveFile(`src/lib/crypto-client/${file}`, `src/modules/vault/crypto-client/${file}`);
}

console.log("done");
