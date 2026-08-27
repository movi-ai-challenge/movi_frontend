import { create } from "zustand";
import type {
  Account,
  DirectTransferResult,
  DirectTransferReview,
  TransferDraft,
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
  directTransferReview: DirectTransferReview | null;
  directTransferResult: DirectTransferResult | null;
  isTransferRequestLocked: boolean;
  setUser: (user: User | null) => void;
  setAccounts: (accounts: Account[]) => void;
  selectAccount: (accountId: string | null) => void;
  setDefaultAccount: (accountId: string) => void;
  setVoiceState: (voice: VoiceState) => void;
  resetVoiceState: () => void;
  setTransferDraft: (transferDraft: TransferDraft) => void;
  clearTransferDraft: () => void;
  setDirectTransferReview: (review: DirectTransferReview) => void;
  clearDirectTransferReview: () => void;
  setDirectTransferResult: (result: DirectTransferResult) => void;
  clearDirectTransferResult: () => void;
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
  directTransferReview: null,
  directTransferResult: null,
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
      defaultAccountId:
        accounts.find((account) => account.isPrimary)?.id ??
        (accounts.some((account) => account.id === state.defaultAccountId)
          ? state.defaultAccountId
          : (accounts[0]?.id ?? null)),
    })),
  selectAccount: (selectedAccountId) => set({ selectedAccountId }),
  setDefaultAccount: (defaultAccountId) =>
    set((state) => ({
      defaultAccountId,
      accounts: state.accounts.map((account) => ({
        ...account,
        isPrimary: account.id === defaultAccountId,
      })),
    })),
  setVoiceState: (voice) => set({ voice }),
  resetVoiceState: () => set({ voice: initialVoiceState }),
  setTransferDraft: (transferDraft) =>
    set({
      transferDraft,
      isTransferRequestLocked: false,
    }),
  clearTransferDraft: () =>
    set({ transferDraft: null, isTransferRequestLocked: false }),
  setDirectTransferReview: (directTransferReview) =>
    set({ directTransferReview, directTransferResult: null }),
  clearDirectTransferReview: () =>
    set({ directTransferReview: null, isTransferRequestLocked: false }),
  setDirectTransferResult: (directTransferResult) =>
    set({ directTransferResult }),
  clearDirectTransferResult: () => set({ directTransferResult: null }),
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
      directTransferReview: null,
      directTransferResult: null,
      isTransferRequestLocked: false,
    }),
}));
