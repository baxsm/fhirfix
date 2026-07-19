export type MappingStatus = "active" | "suggested" | "deprecated" | "rejected";

export type MappingType = "authority_to_system" | "code_to_code" | "facility_to_org" | "custom";

export interface MappingRow {
  id: string;
  scope: "workspace" | "source_system";
  sourceSystem: string | null;
  type: MappingType;
  sourceValue: string;
  targetValue: string;
  targetSystem: string | null;
  status: MappingStatus;
  confidence: number | null;
  version: number;
  supersedesId: string | null;
  createdBy: string;
  approvedBy: string | null;
  createdAt: string | Date;
}

export interface MappingVersion {
  id: string;
  version: number;
  targetValue: string;
  targetSystem: string | null;
  status: MappingStatus;
  supersedesId: string | null;
  supersededById: string | null;
  createdBy: string;
  approvedBy: string | null;
  createdAt: string | Date;
}

export const TYPE_LABELS: Record<MappingType, string> = {
  authority_to_system: "Authority",
  code_to_code: "Code",
  facility_to_org: "Facility",
  custom: "Custom",
};
