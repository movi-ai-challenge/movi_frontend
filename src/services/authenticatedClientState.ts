import { clearTransferRecoveryKey } from "./transferRecoveryStorage.ts";
import { useAuthStore } from "../store/useAuthStore.ts";
import { useBankStore } from "../store/useBankStore.ts";

export function clearAuthenticatedClientState(): void {
  useAuthStore.getState().clearSession();
  useBankStore.getState().resetBankState();
  clearTransferRecoveryKey();
}

export async function runWithAuthenticatedClientCleanup<T>(
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } finally {
    clearAuthenticatedClientState();
  }
}

export async function clearAuthenticatedClientStateOnError<T>(
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error: unknown) {
    clearAuthenticatedClientState();
    throw error;
  }
}
