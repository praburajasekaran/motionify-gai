#!/usr/bin/env node
/**
 * audit-links.mjs
 * Scans all TSX/JSX/TS/JS files for broken, dummy, or unresolved links.
 *
 * Usage:
 *   node scripts/audit-links.mjs
 *   node scripts/audit-links.mjs --fix-report   (outputs JSON for CI)
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

// Patterns that indicate a broken/dummy link
const DUMMY_PATTERNS = [
  { pattern: /href="#"/, label: 'href="#" (no-op anchor)' },
  { pattern: /href=''/, label: "href='' (empty)" },
  { pattern: /href=""/, label: 'href="" (empty)' },
  { pattern: /href=\{["'`]#["'`]\}/, label: "href={\"#\"} (no-op anchor in JSX)" },
  { pattern: /to="#"/, label: 'to="#" (React Router no-op)' },
  { pattern: /to=''/, label: "to='' (React Router empty)" },
  { pattern: /to=""/, label: 'to="" (React Router empty)' },
  { pattern: /href="javascript:void/, label: "href=javascript:void (anti-pattern)" },
  { pattern: /href="javascript:;/, label: "href=javascript:; (anti-pattern)" },
  { pattern: /onClick.*href="#"/, label: "href=# with onClick (should use button)" },
];

// Directories to skip entirely
const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  ".turbo",
  "coverage",
  "__pycache__",
  ".playwright-mcp",
  "playwright-report",
  "test-results",
  "worktrees",   // git worktrees are separate working copies — not the active codebase
]);

// File extensions to scan
const SCAN_EXTS = new Set([".tsx", ".jsx", ".ts", ".js"]);

function walk(dir, results = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const fullPath = join(dir, entry);
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      walk(fullPath, results);
    } else {
      const ext = "." + entry.split(".").pop();
      if (SCAN_EXTS.has(ext)) results.push(fullPath);
    }
  }
  return results;
}

function scanFile(filePath) {
  const relPath = relative(ROOT, filePath);
  let content;
  try {
    content = readFileSync(filePath, "utf8");
  } catch {
    return [];
  }

  const lines = content.split("\n");
  const findings = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const { pattern, label } of DUMMY_PATTERNS) {
      if (pattern.test(line)) {
        findings.push({
          file: relPath,
          line: i + 1,
          label,
          snippet: line.trim().slice(0, 120),
        });
      }
    }
  }

  return findings;
}

// ─── Run ────────────────────────────────────────────────────────────────────

const allFiles = walk(ROOT);
const allFindings = allFiles.flatMap(scanFile);

const isFixReport = process.argv.includes("--fix-report");

if (isFixReport) {
  console.log(JSON.stringify(allFindings, null, 2));
  process.exit(allFindings.length > 0 ? 1 : 0);
}

// Human-readable output
if (allFindings.length === 0) {
  console.log("\n  No dummy or broken links found.\n");
  process.exit(0);
}

// Group by file
const byFile = {};
for (const f of allFindings) {
  if (!byFile[f.file]) byFile[f.file] = [];
  byFile[f.file].push(f);
}

console.log(`\n  Found ${allFindings.length} dummy/broken link(s) across ${Object.keys(byFile).length} file(s):\n`);

for (const [file, items] of Object.entries(byFile)) {
  console.log(`  ${file}`);
  for (const item of items) {
    console.log(`    Line ${String(item.line).padEnd(4)}  [${item.label}]`);
    console.log(`           ${item.snippet}`);
  }
  console.log();
}

process.exit(1);
