import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import {
  getExtensionStorageItem,
  removeExtensionStorageItem,
  setExtensionStorageItem,
} from "@/lib/extension-storage";
import {
  DEFAULT_OPENCODE_BASE_URL,
  DEFAULT_OPENCODE_HOST,
  DEFAULT_OPENCODE_PORT,
  splitOpenCodeBaseUrl,
} from "@/lib/opencode-endpoint";

type VerificationError = "invalid" | "unavailable" | "permissionDenied" | null;

type OpenCodeAuthState = {
  password: string | null;
  baseUrl: string;
  serverAddress: string;
  port: string;
  dialogOpen: boolean;
  hasAuthenticated: boolean;
  isVerifying: boolean;
  verificationError: VerificationError;
  hasHydrated: boolean;
  startVerification: (password: string, baseUrl: string) => void;
  setPassword: (password: string | null) => void;
  setServerAddress: (address: string) => void;
  setPort: (port: string) => void;
  setBaseUrl: (baseUrl: string) => void;
  setDialogOpen: (open: boolean) => void;
  markAuthenticated: () => void;
  requirePassword: () => void;
  failVerification: (error?: "unavailable" | "permissionDenied") => void;
  setHasHydrated: (hasHydrated: boolean) => void;
};

const extensionStorage: StateStorage = {
  getItem: getExtensionStorageItem,
  setItem: setExtensionStorageItem,
  removeItem: removeExtensionStorageItem,
};

export const useOpenCodeAuthStore = create<OpenCodeAuthState>()(
  persist(
    (set) => ({
      password: null,
      baseUrl: DEFAULT_OPENCODE_BASE_URL,
      serverAddress: DEFAULT_OPENCODE_HOST,
      port: DEFAULT_OPENCODE_PORT,
      hasAuthenticated: false,
      dialogOpen: true,
      isVerifying: false,
      verificationError: null,
      hasHydrated: false,
      startVerification: (password, baseUrl) => {
        const endpoint = splitOpenCodeBaseUrl(baseUrl);
        set({
          password,
          baseUrl,
          serverAddress: endpoint.address,
          port: endpoint.port,
          dialogOpen: true,
          isVerifying: true,
          verificationError: null,
        });
      },
      setPassword: (password) => set({ password }),
      setServerAddress: (serverAddress) => set({ serverAddress }),
      setPort: (port) => set({ port }),
      setBaseUrl: (baseUrl) => {
        const endpoint = splitOpenCodeBaseUrl(baseUrl);
        set({ baseUrl, serverAddress: endpoint.address, port: endpoint.port });
      },
      setDialogOpen: (dialogOpen) => set({ dialogOpen }),
      markAuthenticated: () =>
        set({
          hasAuthenticated: true,
          dialogOpen: false,
          isVerifying: false,
          verificationError: null,
        }),
      requirePassword: () =>
        set({
          password: null,
          dialogOpen: true,
          isVerifying: false,
          verificationError: "invalid",
        }),
      failVerification: (error = "unavailable") =>
        set({
          dialogOpen: true,
          isVerifying: false,
          verificationError: error,
        }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "webpilot.opencode-settings",
      storage: createJSONStorage(() => extensionStorage),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
      partialize: (state) => ({
        password: state.password,
        baseUrl: state.baseUrl,
        serverAddress: state.serverAddress,
        port: state.port,
      }),
    },
  ),
);