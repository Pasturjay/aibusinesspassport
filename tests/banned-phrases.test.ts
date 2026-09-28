import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { BANNED_PHRASES } from "@/lib/copy";

function scanDirectory(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (file !== "node_modules" && file !== ".next" && file !== "dist") {
        scanDirectory(fullPath, fileList);
      }
    } else if (/\.(tsx?|jsx?|md|json)$/.test(file)) {
      fileList.push(fullPath);
    }
  }

  return fileList;
}

describe("Plain-Language Product Copy Guard", () => {
  it("ensures no banned legalistic or statutory phrases exist in /app and /lib", () => {
    const appDir = path.resolve(__dirname, "../app");
    const libDir = path.resolve(__dirname, "../lib");

    const filesToScan = [
      ...scanDirectory(appDir),
      ...scanDirectory(libDir),
    ].filter((filePath) => {
      // Exclude copy.ts definition itself where banned phrases are defined as constant list
      const normalized = filePath.replace(/\\/g, "/");
      return !normalized.endsWith("/lib/copy.ts");
    });

    const violations: { file: string; line: number; phrase: string }[] = [];

    for (const filePath of filesToScan) {
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");

      lines.forEach((line, index) => {
        for (const phrase of BANNED_PHRASES) {
          if (line.toLowerCase().includes(phrase.toLowerCase())) {
            violations.push({
              file: path.relative(path.resolve(__dirname, ".."), filePath),
              line: index + 1,
              phrase,
            });
          }
        }
      });
    }

    if (violations.length > 0) {
      const formatted = violations
        .map((v) => ` - [${v.file}:${v.line}] contains banned phrase "${v.phrase}"`)
        .join("\n");
      expect.fail(
        `Found ${violations.length} banned phrase violation(s) in codebase:\n${formatted}\n` +
          `Replace with plain-language equivalents defined in lib/copy.ts.`
      );
    }

    expect(violations).toHaveLength(0);
  });
});
