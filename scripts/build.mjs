#!/usr/bin/env node
// Copy source/skills/ -> .claude/skills/
// Minimal build: skills are authored in their final form, no templating.

import { cp, rm, mkdir, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url)) + "/..";
const src = join(root, "source/skills");
const out = join(root, ".claude/skills");

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

const skills = await readdir(src, { withFileTypes: true });
for (const entry of skills) {
  if (!entry.isDirectory()) continue;
  await cp(join(src, entry.name), join(out, entry.name), { recursive: true });
  console.log(`  built .claude/skills/${entry.name}`);
}

console.log(`\nbuilt ${skills.length} skills`);
