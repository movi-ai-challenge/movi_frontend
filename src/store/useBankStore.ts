import { create } from "zustand";
import type {
  Account,
  TransferDraft,
  TransferResult,
  User,
  VoiceState,
} from "@/types";

const initialVoiceState: VoiceState = { status: "idle", transcript: "", errorMessage: null };

interface BankStore {
  user: User | null;
  accounts: Account[];
  selectedAccountId: string | null;
  defaultAccountId: string | null;
  voice: VoiceState;
  transferDraft: TransferDraft | null;
  transferResult: TransferResult | null;
  isTransferRequestLocked: boolean;
  setUser: (user: User | null) => void;
  setAccounts: (accounts: Account[]) => void;
  selectAccount: (accountId: string | null) => void;
  setDefaultAccount: (accountId: string) => void;
  setVoiceState: (voice: VoiceState) => void;
  resetVoiceState: () => void;
  setTransferDraft: (transferDraft: TransferDraft) => void;
  clearTransferDraft: () => void;
  setTransferResult: (transferResult: TransferResult) => void;
  clearTransferResult: () => void;
  lockTransferRequest: () => boolean;
  unlockTransferRequest: () => void;
  resetBankState: () => void;
}

export const useBankStore = create<BankStore>((set) => ({
  user: null,
  accounts: [],
  selectedAccountId: null,
  defaultAccountId: null,
  voice: initialVoiceState,
  transferDraft: null,
  transferResult: null,
  isTransferRequestLocked: false,
  setUser: (user) => set({ user }),
  setAccounts: (accounts) =>
    set((state) => ({
      accounts,
      selectedAccountId: accounts.some(
        (account) => account.id === state.selectedAccountId,
      )
        ? state.selectedAccountId
        : (accounts[0]?.id ?? null),
      defaultAccountId: accounts.some(
        (account) => account.id === state.defaultAccountId,
      )
        ? state.defaultAccountId
        : (accounts[0]?.id ?? null),
    })),
  selectAccount: (selectedAccountId) => set({ selectedAccountId }),
  setDefaultAccount: (defaultAccountId) => set({ defaultAccountId }),
  setVoiceState: (voice) => set({ voice }),
  resetVoiceState: () => set({ voice: initialVoiceState }),
  setTransferDraft: (transferDraft) =>
    set({
      transferDraft,
      transferResult: null,
      isTransferRequestLocked: false,
    }),
  clearTransferDraft: () =>
    set({ transferDraft: null, isTransferRequestLocked: false }),
  setTransferResult: (transferResult) => set({ transferResult }),
  clearTransferResult: () => set({ transferResult: null }),
  lockTransferRequest: () => {
    let didLock = false;
    set((state) => {
      if (state.isTransferRequestLocked) return state;
      didLock = true;
      return { isTransferRequestLocked: true };
    });
    return didLock;
  },
  unlockTransferRequest: () => set({ isTransferRequestLocked: false }),
  resetBankState: () =>
    set({
      user: null,
      accounts: [],
      selectedAccountId: null,
      defaultAccountId: null,
      voice: initialVoiceState,
      transferDraft: null,
      transferResult: null,
      isTransferRequestLocked: false,
    }),
}));
