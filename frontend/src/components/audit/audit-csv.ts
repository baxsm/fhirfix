interface AuditExportRow {
  id: string;
  action: string;
  actorType: string;
  actorId: string | null;
  actorName?: string | null;
  targetRef: string | null;
  ip: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string | Date;
}

const COLUMNS = [
  "id",
  "createdAt",
  "action",
  "actorType",
  "actorName",
  "actorId",
  "targetRef",
  "ip",
  "metadata",
] as const;

function escapeCell(value: string | null): string {
  const s = value ?? "";
  if (!/[",\r\n]/.test(s)) return s;
  return `"${s.replaceAll('"', '""')}"`;
}

function cell(row: AuditExportRow, column: (typeof COLUMNS)[number]): string {
  if (column === "metadata") {
    return row.metadata ? JSON.stringify(row.metadata) : "";
  }
  if (column === "createdAt") {
    return new Date(row.createdAt).toISOString();
  }
  return row[column] ?? "";
}

export function auditCsv(rows: AuditExportRow[]): string {
  const lines = [COLUMNS.join(",")];
  for (const r of rows) {
    lines.push(COLUMNS.map((c) => escapeCell(cell(r, c))).join(","));
  }
  // trailing newline: posix tools treat a file without one as truncated.
  return `${lines.join("\n")}\n`;
}

export function downloadCsv(body: string, filename: string) {
  const url = URL.createObjectURL(new Blob([body], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
