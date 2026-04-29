export function toCSV(
  rows: Record<string, unknown>[],
  headers: string[]
): string {
  const esc = (v: unknown): string => {
    const s = (v ?? "").toString();
    if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
    return s;
  };
  const out: string[] = [];
  out.push(headers.join(","));
  for (const r of rows) {
    out.push(headers.map((h) => esc(r[h])).join(","));
  }
  return out.join("\n");
}

export function fromCSV(text: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  // Strip UTF-8 BOM (common in Excel exports)
  const cleaned = text.replace(/^﻿/, "");

  const lines = cleaned
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length);
  if (!lines.length) return { headers: [], rows: [] };

  // Auto-detect delimiter: semicolon (European Excel) vs comma
  const firstLine = lines[0];
  const delimiter = firstLine.includes(";") && !firstLine.includes(",") ? ";" : ",";

  const parseLine = (line: string): string[] => {
    const cells: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
          continue;
        }
        inQ = !inQ;
        continue;
      }
      if (ch === delimiter && !inQ) {
        cells.push(cur);
        cur = "";
        continue;
      }
      cur += ch;
    }
    cells.push(cur);
    return cells.map((c) => c.trim());
  };

  // Normalize headers: lowercase + trim so column names are case-insensitive
  const headers = parseLine(lines[0]).map((h) => h.trim().toLowerCase());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i]);
    // Skip fully empty rows
    if (cells.every((c) => !c.trim())) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => (row[h] = cells[idx] ?? ""));
    rows.push(row);
  }
  return { headers, rows };
}
