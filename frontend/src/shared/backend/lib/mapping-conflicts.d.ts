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
export declare function findConflicts(rows: ConflictCandidate[]): MappingConflict[];
