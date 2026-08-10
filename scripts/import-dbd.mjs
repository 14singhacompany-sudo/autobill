#!/usr/bin/env node
import { createReadStream } from "node:fs";
import { Readable, Transform } from "node:stream";
import { createInterface } from "node:readline";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { mapDbdRow, parseCsvRecord } from "./import-dbd-lib.mjs";

const BATCH_SIZE = 500;

function sourceStream(source) {
  if (/^https?:\/\//i.test(source)) {
    return fetch(source).then((response) => {
      if (!response.ok || !response.body) throw new Error(`Download failed (${response.status})`);
      return Readable.fromWeb(response.body);
    });
  }
  return Promise.resolve(createReadStream(source));
}

async function* csvRows(stream) {
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  let headers;
  let pending = "";
  for await (const line of lines) {
    pending += (pending ? "\n" : "") + line;
    if ((pending.match(/"/g)?.length || 0) % 2) continue;
    const values = parseCsvRecord(pending.replace(/^\uFEFF/, ""));
    pending = "";
    if (!headers) { headers = values.map((value) => value.trim()); continue; }
    yield Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  }
  if (pending) throw new Error("Malformed CSV: unterminated quoted field");
}

async function* ndjsonRows(stream) {
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of lines) if (line.trim()) yield JSON.parse(line);
}

async function* jsonArrayRows(stream) {
  stream.setEncoding("utf8");
  let buffer = "", cursor = 0, depth = 0, inString = false, escaped = false, started = false, objectStart = -1;
  for await (const chunk of stream) {
    buffer += chunk;
    while (cursor < buffer.length) {
      const char = buffer[cursor];
      if (!started) { if (/\s|\uFEFF/.test(char)) { cursor++; continue; } if (char !== "[") throw new Error("JSON source must be an array"); started = true; cursor++; continue; }
      if (escaped) { escaped = false; cursor++; continue; }
      if (inString && char === "\\") { escaped = true; cursor++; continue; }
      if (char === '"') { inString = !inString; cursor++; continue; }
      if (inString) { cursor++; continue; }
      if (char === "{") { if (depth === 0) objectStart = cursor; depth++; }
      else if (char === "}") {
        depth--;
        if (depth === 0 && objectStart >= 0) {
          yield JSON.parse(buffer.slice(objectStart, cursor + 1));
          buffer = buffer.slice(cursor + 1); cursor = 0; objectStart = -1;
          continue;
        }
      }
      cursor++;
    }
    if (depth === 0 && buffer.length > 1024) { buffer = buffer.slice(-16); cursor = buffer.length; }
    else if (objectStart > 0) { buffer = buffer.slice(objectStart); cursor -= objectStart; objectStart = 0; }
  }
  if (depth !== 0) throw new Error("Malformed JSON: incomplete object");
}

function formatOf(source) {
  const pathname = new URL(source, "file:///").pathname.toLowerCase();
  if (pathname.endsWith(".csv")) return "csv";
  if (pathname.endsWith(".ndjson") || pathname.endsWith(".jsonl")) return "ndjson";
  if (pathname.endsWith(".json")) return "json";
  throw new Error("Unsupported format; use .csv, .json, .jsonl, or .ndjson");
}

export async function runImport(source) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const stream = await sourceStream(source);
  const format = formatOf(source);
  const rows = format === "csv" ? csvRows(stream) : format === "ndjson" ? ndjsonRows(stream) : jsonArrayRows(stream);
  const stats = { inserted: 0, updated: 0, skipped: 0, failed: 0 };
  let batch = [];

  const flush = async () => {
    if (!batch.length) return;
    const deduplicated = [...new Map(batch.map((row) => [row.tax_id, row])).values()];
    const ids = deduplicated.map((row) => row.tax_id);
    const { data: existing, error: readError } = await supabase.from("thai_company_registry").select("tax_id").in("tax_id", ids);
    if (readError) throw readError;
    const existingIds = new Set(existing.map((row) => row.tax_id));
    const { error } = await supabase.from("thai_company_registry").upsert(deduplicated, { onConflict: "tax_id" });
    if (error) { stats.failed += deduplicated.length; console.error("Batch failed:", error.message); }
    else for (const row of deduplicated) existingIds.has(row.tax_id) ? stats.updated++ : stats.inserted++;
    stats.skipped += batch.length - deduplicated.length;
    batch = [];
  };

  for await (const rawRow of rows) {
    try {
      const row = mapDbdRow(rawRow);
      if (!row) { stats.skipped++; continue; }
      batch.push(row);
      if (batch.length >= BATCH_SIZE) await flush();
    } catch (error) { stats.failed++; console.error("Malformed row:", error.message); }
  }
  await flush();
  console.log(JSON.stringify(stats, null, 2));
  return stats;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const source = process.argv[2];
  if (!source) { console.error("Usage: npm run import:dbd -- <file-or-url>"); process.exitCode = 1; }
  else runImport(source).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
