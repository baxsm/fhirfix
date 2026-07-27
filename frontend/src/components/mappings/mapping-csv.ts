import type { MappingType } from "./types";

export interface ExportRow {
  type: MappingType;
  sourceValue: string;
  targetValue: string;
  targetSystem: string | null;
  scope: "workspace" | "source_system";
  sourceSystem: string | null;
}

export const CSV_COLUMNS = [
  "type",
  "sourceValue",
  "targetValue",
  "targetSystem",
  "scope",
  "sourceSystem",
] as const;

function escapeCell(value: string | null): string {
  const s = value ?? "";
  if (!/[",\r\n]/.test(s)) return s;
  return `"${s.replaceAll('"', '""')}"`;
}

export function toCsv(rows: ExportRow[]): string {
  const lines = [CSV_COLUMNS.join(",")];
  for (const r of rows) {
    lines.push(CSV_COLUMNS.map((c) => escapeCell(r[c])).join(","));
  }
  // trailing newline: posix tools treat a file without one as truncated.
  return `${lines.join("\n")}\n`;
}

export function toJson(rows: ExportRow[]): string {
  return `${JSON.stringify(rows, null, 2)}\n`;
}

function parseLine(text: string, start: number): { cells: string[]; next: number } | null {
  const cells: string[] = [];
  let cell = "";
  let i = start;
  let quoted = false;

  while (i < text.length) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i++;
        continue;
      }
      cell += ch;
      i++;
      continue;
    }
    if (ch === '"' && cell === "") {
      quoted = true;
      i++;
      continue;
    }
    if (ch === ",") {
      cells.push(cell);
      cell = "";
      i++;
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      const skip = ch === "\r" && text[i + 1] === "\n" ? 2 : 1;
      cells.push(cell);
      return { cells, next: i + skip };
    }
    cell += ch;
    i++;
  }

  if (quoted) return null;
  cells.push(cell);
  return { cells, next: i };
}

export interface ParseResult {
  rows: ExportRow[];
  // 1-based line numbers, so a message can point at the actual line in the file.
  errors: { line: number; reason: string }[];
}

const TYPES: MappingType[] = ["authority_to_system", "code_to_code", "facility_to_org", "custom"];

export function parseCsv(text: string): ParseResult {
  const rows: ExportRow[] = [];
  const errors: ParseResult["errors"] = [];

  const stripped = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  let cursor = 0;
  let lineNo = 0;
  let header: string[] | null = null;

  while (cursor < stripped.length) {
    const parsed = parseLine(stripped, cursor);
    if (!parsed) {
      errors.push({ line: lineNo + 1, reason: "unterminated quote" });
      break;
    }
    cursor = parsed.next;
    lineNo++;

    const isBlank = parsed.cells.every((c) => c.trim() === "");
    if (isBlank) continue;

    if (!header) {
      header = parsed.cells.map((c) => c.trim());
      const missing = CSV_COLUMNS.filter(
        (c) => c !== "sourceSystem" && c !== "targetSystem",
      ).filter((c) => !header?.includes(c));
      if (missing.length > 0) {
        errors.push({ line: lineNo, reason: `missing column(s): ${missing.join(", ")}` });
        return { rows, errors };
      }
      continue;
    }

    const get = (name: string) => {
      const idx = header?.indexOf(name) ?? -1;
      return idx === -1 ? "" : (parsed.cells[idx] ?? "").trim();
    };

    const type = get("type") as MappingType;
    if (!TYPES.includes(type)) {
      errors.push({ line: lineNo, reason: `unknown type "${get("type")}"` });
      continue;
    }
    const sourceValue = get("sourceValue");
    const targetValue = get("targetValue");
    if (!sourceValue || !targetValue) {
      errors.push({ line: lineNo, reason: "sourceValue and targetValue are both required" });
      continue;
    }
    const scopeRaw = get("scope") || "workspace";
    if (scopeRaw !== "workspace" && scopeRaw !== "source_system") {
      errors.push({ line: lineNo, reason: `unknown scope "${scopeRaw}"` });
      continue;
    }
    const sourceSystem = get("sourceSystem") || null;
    // the backend rejects this pair outright. catching it here names the line.
    if (scopeRaw === "source_system" && !sourceSystem) {
      errors.push({ line: lineNo, reason: "a source_system mapping needs a sourceSystem" });
      continue;
    }

    rows.push({
      type,
      sourceValue,
      targetValue,
      targetSystem: get("targetSystem") || null,
      scope: scopeRaw,
      sourceSystem: scopeRaw === "workspace" ? null : sourceSystem,
    });
  }

  if (!header) errors.push({ line: 1, reason: "the file is empty" });
  return { rows, errors };
}
