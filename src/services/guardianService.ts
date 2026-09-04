import { api, isMockMode } from "@/services/api";
import { isRecord, parseApiResponse } from "@/services/apiResponse";

const GUARDIAN_LINKS_PATH = "/api/v1/guardian-links";

export interface GuardianLinkSummary {
  linkId: string;
  status: "ACTIVE";
  guardianName: string;
  relation: string | null;
}

interface RawGuardianLink {
  linkId: number | string;
  status: "ACTIVE";
  guardianName: string;
  relation: string | null;
}

function isGuardianLink(value: unknown): value is RawGuardianLink {
  return isRecord(value)
    && (typeof value.linkId === "number" || typeof value.linkId === "string")
    && value.status === "ACTIVE"
    && typeof value.guardianName === "string"
    && (value.relation === null || typeof value.relation === "string");
}

function toSummary(value: RawGuardianLink): GuardianLinkSummary {
  return { ...value, linkId: String(value.linkId) };
}

export async function getGuardianLinks(): Promise<GuardianLinkSummary[]> {
  if (isMockMode) return [];
  const response = await api.get<unknown>(GUARDIAN_LINKS_PATH);
  const parsed = parseApiResponse(
    response.data,
    (value): value is RawGuardianLink[] =>
      Array.isArray(value) && value.every(isGuardianLink),
  );
  return parsed.data.map(toSummary);
}

export async function registerGuardianLink(input: {
  guardianName: string;
  guardianPhone: string;
  relation: string;
}): Promise<GuardianLinkSummary> {
  if (isMockMode) {
    return {
      linkId: `mock-${Date.now()}`,
      status: "ACTIVE",
      guardianName: input.guardianName.trim(),
      relation: input.relation.trim() || null,
    };
  }
  const response = await api.post<unknown>(GUARDIAN_LINKS_PATH, input);
  const parsed = parseApiResponse(response.data, isGuardianLink);
  return toSummary(parsed.data);
}
