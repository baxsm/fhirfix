// which active mappings shadow each other. pure so it can be tested without a db.
//
// the live-unique index already guarantees one row per (workspace, type, source
// value, scope, source system). what it cannot express is that a workspace-scoped
// row and a source-system-scoped row for the SAME source value both apply to the
// same run, and only one of them wins.

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
  // loadActiveMappings orders source_system before workspace and the engine takes
  // the first match, so the scoped row is the one that actually applies.
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
    // two source-system rows on different feeds never compete: a run names one
    // source system, so it only ever sees one of them.
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
