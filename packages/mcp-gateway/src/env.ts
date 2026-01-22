import fs from "node:fs";
import path from "node:path";

function parseDotenvLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return undefined;
  const eq = trimmed.indexOf("=");
  if (eq === -1) return undefined;
  const key = trimmed.slice(0, eq).trim();
  if (!key) return undefined;
  let value = trimmed.slice(eq + 1).trim();
  if (!value) return { key, value: "" };
  if (value.startsWith("\"") && value.endsWith("\"") && value.length >= 2) value = value.slice(1, -1);
  if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) value = value.slice(1, -1);
  if (value.startsWith("`") && value.endsWith("`") && value.length >= 2) value = value.slice(1, -1);
  return { key, value };
}

export function loadEnvFromFiles(opts?: { rootDir?: string }) {
  const rootDir = opts?.rootDir ?? process.cwd();
  const candidates = [path.join(rootDir, ".env.local"), path.join(rootDir, ".env")];

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    const raw = fs.readFileSync(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const parsed = parseDotenvLine(line);
      if (!parsed) continue;
      if (typeof process.env[parsed.key] === "string") continue;
      process.env[parsed.key] = parsed.value;
    }
  }
}

