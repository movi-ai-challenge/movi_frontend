const TRANSFER_RECOVERY_STORAGE_KEY = "movi.transfer.recovery.v1";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface StoredTransferRecovery {
  idempotencyKey: string;
  storedAt: string;
}

export function isValidIdempotencyKey(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function parseStoredTransferRecovery(value: string): StoredTransferRecovery | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null) return null;
    const record = parsed as Record<string, unknown>;
    if (
      !isValidIdempotencyKey(record.idempotencyKey) ||
      typeof record.storedAt !== "string" ||
      Number.isNaN(Date.parse(record.storedAt))
    ) {
      return null;
    }
    return {
      idempotencyKey: record.idempotencyKey,
      storedAt: record.storedAt,
    };
  } catch {
    return null;
  }
}

export function saveTransferRecoveryKey(idempotencyKey: string): void {
  if (!isValidIdempotencyKey(idempotencyKey)) {
    throw new Error("유효하지 않은 송금 멱등성 키입니다.");
  }
  const recovery: StoredTransferRecovery = {
    idempotencyKey,
    storedAt: new Date().toISOString(),
  };
  window.sessionStorage.setItem(
    TRANSFER_RECOVERY_STORAGE_KEY,
    JSON.stringify(recovery),
  );
}

export function readTransferRecoveryKey(): string | null {
  try {
    const stored = window.sessionStorage.getItem(TRANSFER_RECOVERY_STORAGE_KEY);
    if (!stored) return null;
    const recovery = parseStoredTransferRecovery(stored);
    if (!recovery) {
      window.sessionStorage.removeItem(TRANSFER_RECOVERY_STORAGE_KEY);
      return null;
    }
    return recovery.idempotencyKey;
  } catch {
    return null;
  }
}

export function clearTransferRecoveryKey(): void {
  try {
    window.sessionStorage.removeItem(TRANSFER_RECOVERY_STORAGE_KEY);
  } catch {
    // 저장소 접근이 제한돼도 이미 표시된 서버 결과는 유지한다.
  }
}
