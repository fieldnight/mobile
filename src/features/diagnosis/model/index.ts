export type {
  BeeDiagnosisAiRequest,
  BeeDiagnosisAiResponse,
  BeeDiagnosisAnalyzeResponse,
  BeeDiagnosisDetailResponse,
  BeeDiagnosisListItem,
  BeeDiagnosisResult,
  BeeDiagnosisSaveRequest,
  BeeDiagnosisStatus,
  SaveDiagnosisParams,
} from "./types";

export function parseDiagnosisConfidence(value: string | number) {
  if (typeof value === "number") return clampConfidence(value);
  const parsed = Number.parseFloat(value.replace("%", "").trim());
  return Number.isFinite(parsed) ? clampConfidence(parsed) : 0;
}

export function splitDiagnosisLines(value?: string) {
  return (value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function clampConfidence(value: number) {
  return Math.min(100, Math.max(0, value));
}
