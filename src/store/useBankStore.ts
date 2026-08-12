import { create } from "zustand";
import type { Account, User, VoiceState } from "@/types";

const initialVoiceState: VoiceState = { status: "idle", transcript: "", errorMessage: null };

interface BankStore {
  user: User | null;
  accounts: Account[];
  selectedAccountId: string | null;
  defaultAccountId: string | null;
  voice: VoiceState;
  setUser: (user: User | null) => void;
  setAccounts: (accounts: Account[]) => void;
  selectAccount: (accountId: string | null) => void;
  setDefaultAccount: (accountId: string) => void;
  setVoiceState: (voice: VoiceState) => void;
  resetVoiceState: () => void;
}

export const useBankStore = create<BankStore>((set) => ({
  user: null,
  accounts: [],
  selectedAccountId: null,
  defaultAccountId: null,
  voice: initialVoiceState,
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
}));
