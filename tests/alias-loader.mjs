import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");

function resolveAlias(specifier) {
  if (!specifier.startsWith("@/")) return null;
  const relative = specifier.slice(2);
  const base = path.join(srcRoot, relative);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.mjs`, path.join(base, "index.ts")];
  return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile()) ?? null;
}

export async function resolve(specifier, context, nextResolve) {
  const file = resolveAlias(specifier);
  if (!file) return nextResolve(specifier, context);
  return nextResolve(pathToFileURL(file).href, context);
}
