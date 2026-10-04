// Mirrors the website's Convex backend into this repo so the app gets its types.
//
// The website repo is the only place the backend is deployed from. The copy
// here exists for `@/convex/_generated/*` imports and must never be deployed:
// an out-of-date copy would replace the live functions.
//
//   node scripts/sync-backend.mjs [path-to-website-repo]   (default ../oxformals)

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const web = resolve(process.argv[2] ?? join(root, "..", "oxformals"));

if (!existsSync(join(web, "convex", "schema.ts"))) {
  console.error(`No Convex backend found at ${web}. Pass the website repo path.`);
  process.exit(1);
}

const isTest = (name) => /\.test\.tsx?$/.test(name);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

// 1. convex/ is replaced wholesale (tests left behind: the app has no vitest).
rmSync(join(root, "convex"), { recursive: true, force: true });
const convexFiles = walk(join(web, "convex")).filter((f) => !isTest(f));
for (const file of convexFiles) {
  const dest = join(root, "convex", relative(join(web, "convex"), file));
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(file, dest);
}

// 2. The shared lib files the backend imports, followed transitively.
const copied = new Set();
const queue = convexFiles.filter((f) => /\.tsx?$/.test(f) && !f.includes("_generated"));
const importRe = /from\s+"((?:\.{1,2}\/|@\/)[^"]+)"/g;

function resolveImport(fromFile, spec) {
  const base = spec.startsWith("@/") ? join(web, spec.slice(2)) : resolve(dirname(fromFile), spec);
  for (const ext of [".ts", ".tsx", "/index.ts"]) {
    if (existsSync(base + ext)) return base + ext;
  }
  return null;
}

while (queue.length > 0) {
  const file = queue.pop();
  for (const match of readFileSync(file, "utf8").matchAll(importRe)) {
    const target = resolveImport(file, match[1]);
    if (!target || copied.has(target)) continue;
    const rel = relative(web, target);
    if (!rel.startsWith("lib/")) continue;
    copied.add(target);
    const dest = join(root, rel);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(target, dest);
    queue.push(target);
  }
}

console.log(
  `Synced ${convexFiles.length} backend files and ${copied.size} shared lib files from ${web}`,
);
