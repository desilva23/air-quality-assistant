// The project's own rules, as tests. Both of the top two Challenge 5 repos had
// a suite like this. It keeps the rules true as the code grows, and it shows a
// reviewer that they are enforced, not only claimed.
//
// Adjust SECRET_ENV and REQUIRED_DOCS for the challenge; leave the rest alone.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Server-only environment variables. Browser code must never mention them. */
const SECRET_ENV = [
  "GROQ_API_KEY",
  "OPENAQ_API_KEY",
  "KV_REST_API_TOKEN",
  "UPSTASH_REDIS_REST_TOKEN",
];

const REQUIRED_DOCS = [
  "README.md",
  "LICENSE",
  "SECURITY.md",
  "CONTRIBUTING.md",
  ".editorconfig",
  ".env.example",
  "docs/ARCHITECTURE.md",
  "docs/TESTING.md",
  "docs/ACCESSIBILITY.md",
  "docs/DEPLOYMENT.md",
  ".github/workflows/ci.yml",
];

const MAX_SOURCE_LINES = 250;
const THIS_FILE = "tests/quality/hygiene.test.ts";
const SKIP = new Set([
  "node_modules",
  ".next",
  "coverage",
  "test-results",
  "playwright-report",
  "reports",
]);

function filesUnder(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const path = join(root, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path.replaceAll("\\", "/")];
  });
}

const read = (path: string): string => readFileSync(path, "utf8");
const isCode = (path: string): boolean => /\.(ts|tsx|mts)$/.test(path);
const source = filesUnder("src").filter(isCode);
const tests = [...filesUnder("tests"), ...filesUnder("e2e")].filter(isCode);
const browserCode = source.filter((file) => read(file).startsWith('"use client"'));

describe("project hygiene", () => {
  it("ships the documents a reviewer or contributor needs", () => {
    for (const doc of REQUIRED_DOCS) expect(existsSync(doc), doc).toBe(true);
  });

  it("keeps src/ for the app: tests live in tests/", () => {
    expect(filesUnder("src").filter((file) => /\.(test|spec)\.[jt]sx?$/.test(file))).toEqual([]);
  });

  it(`keeps every source file under ${String(MAX_SOURCE_LINES)} lines`, () => {
    for (const file of source) {
      expect(read(file).split("\n").length, file).toBeLessThanOrEqual(MAX_SOURCE_LINES);
    }
  });

  it("never switches off the type checker or the linter", () => {
    for (const file of [...source, ...tests].filter((path) => path !== THIS_FILE)) {
      const text = read(file);
      // `any` only as a type (before code punctuation), so prose like "as any other" passes.
      expect(text, file).not.toMatch(/(?::\s*any|\bas any)\s*(?:[\][;),}>=|&]|$)|<any>/m);
      expect(text, file).not.toMatch(/@ts-(ignore|nocheck|expect-error)|eslint-disable/);
    }
  });

  it("never renders text as HTML or evaluates code", () => {
    for (const file of source) {
      expect(read(file), file).not.toMatch(
        /dangerouslySetInnerHTML|\.innerHTML\s*=|\beval\(|new Function\(/,
      );
    }
  });

  it("logs nothing from the browser, and only errors from the server", () => {
    for (const file of browserCode) expect(read(file), file).not.toMatch(/console\.\w+\(/);
    for (const file of source) expect(read(file), file).not.toMatch(/console\.(log|debug|info)\(/);
  });

  it("keeps secrets on the server and out of the repository", () => {
    for (const file of browserCode) {
      for (const name of SECRET_ENV)
        expect(read(file), `${file} mentions ${name}`).not.toContain(name);
    }
    for (const file of [...source, ...tests, ...filesUnder("docs")]) {
      expect(read(file), file).not.toMatch(
        /gsk_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY/,
      );
    }
    expect(read(".gitignore")).toMatch(/^\.env$/m);
  });

  it("reads settings in one module, so blank values mean unset everywhere", () => {
    for (const file of source) {
      if (file === "src/lib/server/config.ts") continue;
      // NODE_ENV is Next's build flag, not a setting.
      const code = read(file).replaceAll("process.env.NODE_ENV", "");
      expect(code, file).not.toContain("process.env");
    }
  });

  it("documents how to run, test and deploy it", () => {
    const readme = read("README.md");
    for (const phrase of [
      "npm run dev",
      "npm run check",
      "npm run test:e2e",
      "Evaluation criteria",
      "SECURITY.md",
    ]) {
      expect(readme, phrase).toContain(phrase);
    }
  });
});
