import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { sources } from ".";

const dir = import.meta.dirname;
const files = readdirSync(dir).filter((file) => /^[a-z0-9-]+\.ts$/.test(file) && file !== "index.ts");

describe("source registry", () => {
  it("registers every source file exactly once", () => {
    expect(sources.map((s) => `${s.id}.ts`).sort()).toEqual(files.sort());
  });

  it("uses kebab-case ids that match the file names", () => {
    for (const source of sources) {
      expect(source.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(files).toContain(`${source.id}.ts`);
    }
  });

  it("has an offline test for every source", () => {
    const tests = readdirSync(dir).filter((file) => file.endsWith(".test.ts"));
    for (const source of sources) {
      expect(tests, `missing ${path.join("sources", `${source.id}.test.ts`)}`).toContain(`${source.id}.test.ts`);
    }
  });

  it("documents a public careers page for every source", () => {
    for (const source of sources) expect(() => new URL(source.website)).not.toThrow();
  });
});
