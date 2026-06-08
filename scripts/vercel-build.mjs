#!/usr/bin/env node
/**
 * Vercel Build Output API v3 script.
 *
 * Produces .vercel/output/ with:
 *  - static/          → React frontend (from vite build)
 *  - functions/api.func/ → bundled Express API (via esbuild)
 *  - config.json      → routing rules
 *
 * This bypasses @vercel/node's transpile-only mode which doesn't bundle
 * relative TypeScript imports in ESM projects ("type":"module").
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function run(cmd) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: root });
}

// ── 1. React frontend ────────────────────────────────────────────────────────
run("npx vite build");

// ── 2. Express API bundle ────────────────────────────────────────────────────
const funcDir = path.join(root, ".vercel/output/functions/api.func");
fs.mkdirSync(funcDir, { recursive: true });

// Bundle everything (including node_modules) into a single CJS file.
// CJS avoids the "type:module" requirement in Lambda environment and
// handles dynamic requires used by some packages (postgres, etc).
run(
  [
    "npx esbuild api/index.ts",
    "--bundle",
    "--platform=node",
    "--target=node18",
    "--format=cjs",   // CJS: no "type":"module" needed in Lambda
    "--minify",
    // Mark native Node modules as external (they can't be bundled anyway)
    "--external:fsevents",
    "--external:pg-native",
    `--outfile=${funcDir}/index.js`,
  ].join(" ")
);

// ── 3. Function metadata ─────────────────────────────────────────────────────
fs.writeFileSync(
  path.join(funcDir, ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs20.x",
      handler: "index.js",
      launcherType: "Nodejs",
      shouldAddHelpers: true,
      shouldAddSourcemapSupport: false,
    },
    null,
    2
  )
);

// ── 4. Static files ──────────────────────────────────────────────────────────
const staticDir = path.join(root, ".vercel/output/static");
fs.mkdirSync(staticDir, { recursive: true });
run(`cp -r dist/public/. ${staticDir}`);

// ── 5. Routing config ────────────────────────────────────────────────────────
fs.writeFileSync(
  path.join(root, ".vercel/output/config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        // API and storage proxy → serverless function
        { src: "/manus-storage/(.*)", dest: "/api" },
        { src: "/api(.*)",            dest: "/api" },
        // Static assets served first, then SPA fallback
        { handle: "filesystem" },
        { src: "/(.*)", dest: "/index.html" },
      ],
    },
    null,
    2
  )
);

console.log("\n✓ Vercel build output ready at .vercel/output/");
