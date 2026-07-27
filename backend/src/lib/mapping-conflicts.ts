export interface ConflictCandidate {
  id: string;
  scope: "workspace" | "source_system";
  sourceSystem: string | null;
  type: string;
  sourceValue: string;
  targetValue: string;
}

export interface MappingConflict {
  type: string;
  sourceValue: string;
  winner: ConflictCandidate;
  overridden: ConflictCandidate[];
}

export function findConflicts(rows: ConflictCandidate[]): MappingConflict[] {
  const groups = new Map<string, ConflictCandidate[]>();
  for (const r of rows) {
    const key = `${r.type}|${r.sourceValue}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(r);
    else groups.set(key, [r]);
  }

  const conflicts: MappingConflict[] = [];
  for (const bucket of groups.values()) {
    if (bucket.length < 2) continue;
    const scoped = bucket.filter((r) => r.scope === "source_system");
    const general = bucket.filter((r) => r.scope === "workspace");
    if (scoped.length === 0 || general.length === 0) continue;
    for (const winner of scoped) {
      conflicts.push({
        type: winner.type,
        sourceValue: winner.sourceValue,
        winner,
        overridden: general,
      });
    }
  }
  return conflicts;
}
