import { api } from "@/lib/api";
import type { GateData } from "@/types/gate-control";
import type { NfcDoorCardConfig } from "../components/nfcDoorCards";
import { buildGateCommand } from "../model/gateCommand";

type Status = "PENDING" | "SUCCESS" | "FAILED" | "TIMEOUT";
type ExecutionStatus = "ACTIVE" | "CANCELLED";
interface CommandResult { commandId: string; status: Status; detail?: string | null }
interface Envelope<T> { data: T }

export interface GateConnection { isConnected: boolean; lastConnectedAt: string | null }

export async function getGateConnection(gate: GateData): Promise<GateConnection> {
  assertValidGateId(gate);
  const response = await api.get<Envelope<GateConnection>>(`/api/v1/gates/${gate.gateId}/connection`, { timeout: 5000 });
  const connection = response.data.data;
  if (!connection || typeof connection.isConnected !== "boolean") throw new Error("서버 연결 상태를 확인하지 못했어요.");
  return connection;
}

export interface GateCurrentCommand {
  commandId: string;
  cardType: string;
  title: string;
  memo?: string | null;
  payload?: unknown;
  executionStatus: ExecutionStatus;
  appliedAt: string;
}

function assertValidGateId(gate: GateData) {
  if (!Number.isSafeInteger(gate.gateId) || gate.gateId <= 0) throw new Error("서버에 등록된 개폐기를 선택해주세요.");
}

async function pollCommandResult(path: string, commandId: string): Promise<CommandResult> {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    let result: CommandResult;
    try {
      const response = await api.get<Envelope<CommandResult>>(`${path}/${encodeURIComponent(commandId)}`, { timeout: Math.min(5000, remaining) });
      result = response.data.data;
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      // Retry only the read. The accepted POST must never be replayed here.
      if (!status || status === 429 || status >= 500) continue;
      throw error;
    }
    if (!result || result.commandId !== commandId) throw new Error("명령 응답이 일치하지 않아요.");
    if (result.status === "SUCCESS") return result;
    if (result.status === "FAILED") throw new Error(result.detail || "개폐기에서 명령을 처리하지 못했어요.");
    if (result.status === "TIMEOUT") break;
    if (result.status !== "PENDING") throw new Error("서버의 명령 상태 응답을 확인하지 못했어요.");
  }
  throw new Error("개폐기 응답을 확인하지 못했어요. 실제 적용 여부를 확인해주세요.");
}

export async function executeGateCard(gate: GateData, card: NfcDoorCardConfig): Promise<CommandResult> {
  assertValidGateId(gate);
  const path = `/api/v1/gates/${gate.gateId}/commands`;
  // Never retry POST automatically: loss of its response does not mean non-execution.
  const accepted = await api.post<Envelope<CommandResult>>(path, buildGateCommand(card, gate.macAddress), { timeout: 10000 });
  const commandId = accepted.data?.data?.commandId;
  if (typeof commandId !== "string" || !commandId.trim()) throw new Error("명령 접수 결과를 확인하지 못했어요. 실행 여부를 확인해주세요.");
  return pollCommandResult(path, commandId);
}

/** 개폐기에 현재 적용(ACTIVE) 중인 명령을 조회합니다. 없으면 null. */
export async function getCurrentGateCommand(gate: GateData): Promise<GateCurrentCommand | null> {
  assertValidGateId(gate);
  const response = await api.get<Envelope<GateCurrentCommand | null>>(
    `/api/v1/gates/${gate.gateId}/commands/current`,
    { timeout: 8000 },
  );
  const current = response.data.data;
  // ApiResponse.success(null) on the server serializes data as {}.
  if (current === null || (current && typeof current === "object" && !Array.isArray(current) && Object.keys(current).length === 0)) return null;
  if (!current || typeof current.commandId !== "string" || !current.commandId.trim() ||
      current.executionStatus !== "ACTIVE" || typeof current.title !== "string") {
    throw new Error("현재 적용 상태 응답을 확인하지 못했어요.");
  }
  return current;
}

/** 개폐기에 적용 중인 명령을 취소합니다(카드 없이 개폐기를 대기 상태로 되돌림). */
export async function cancelGateCommand(gate: GateData, targetCommandId: string): Promise<CommandResult> {
  assertValidGateId(gate);
  if (typeof targetCommandId !== "string" || !targetCommandId.trim()) throw new Error("취소할 명령을 확인하지 못했어요.");
  const macAddress = gate.macAddress.trim().toUpperCase();
  if (!/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(macAddress)) throw new Error("개폐기 MAC 주소를 확인해주세요.");
  const path = `/api/v1/gates/${gate.gateId}/commands`;
  const accepted = await api.post<Envelope<CommandResult>>(
    path,
    { gateId: macAddress, operation: "CANCEL", targetCommandId },
    { timeout: 10000 },
  );
  const commandId = accepted.data?.data?.commandId;
  if (typeof commandId !== "string" || !commandId.trim()) throw new Error("취소 접수 결과를 확인하지 못했어요.");
  return pollCommandResult(path, commandId);
}
