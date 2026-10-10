import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifyOpenCodeCredentials } from "@/lib/api/session";
import {
  buildOpenCodeBaseUrl,
  configureOpenCodeEndpoint,
} from "@/lib/opencode-endpoint";
import { useOpenCodeAuthStore } from "@/lib/stores/opencode-auth";
import { ArrowLeftIcon, XIcon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";

export function OpenCodeSettingsPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const baseUrl = useOpenCodeAuthStore((state) => state.baseUrl);
  const serverAddress = useOpenCodeAuthStore((state) => state.serverAddress);
  const port = useOpenCodeAuthStore((state) => state.port);
  const storedPassword = useOpenCodeAuthStore((state) => state.password);
  const formPassword = storedPassword ?? "";
  const hasAuthenticated = useOpenCodeAuthStore(
    (state) => state.hasAuthenticated,
  );
  const setBaseUrl = useOpenCodeAuthStore((state) => state.setBaseUrl);
  const setStoredPassword = useOpenCodeAuthStore((state) => state.setPassword);
  const setServerAddress = useOpenCodeAuthStore(
    (state) => state.setServerAddress,
  );
  const setPort = useOpenCodeAuthStore((state) => state.setPort);
  const setDialogOpen = useOpenCodeAuthStore((state) => state.setDialogOpen);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextBaseUrl = buildOpenCodeBaseUrl(serverAddress, port);
    if (!nextBaseUrl) {
      setError("invalidEndpoint");
      setSaved(false);
      return;
    }
    if (!formPassword) return;

    setIsSaving(true);
    setError(null);
    setSaved(false);

    try {
      const hasPermission = await configureOpenCodeEndpoint(nextBaseUrl);
      if (!hasPermission) {
        setError("permissionDenied");
        return;
      }

      const previousBaseUrl = baseUrl;
      const previousPassword = storedPassword;
      setBaseUrl(nextBaseUrl);
      setStoredPassword(formPassword);
      if (hasAuthenticated && storedPassword) {
        try {
          await verifyOpenCodeCredentials();
          setSaved(true);
        } catch {
          if (useOpenCodeAuthStore.getState().verificationError === "invalid") {
            return;
          }
          setBaseUrl(previousBaseUrl);
          setStoredPassword(previousPassword);
          await configureOpenCodeEndpoint(previousBaseUrl).catch(() => false);
          setError("connectionFailed");
        }
        return;
      }

      setDialogOpen(true);
      setLocation("/login");
    } catch {
      setError("connectionFailed");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="h-dvh w-full overflow-y-auto bg-slate-50 text-slate-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
      <div className="mx-auto flex min-h-full w-full flex-col px-4 py-4">
        <header className="mb-8 flex items-center gap-3">
          <Button
            aria-label={t("session.backToConversation")}
            onClick={() => {
              if (!hasAuthenticated || !storedPassword) {
                setDialogOpen(true);
                setLocation("/login");
              } else {
                setLocation("/");
              }
            }}
            size="icon"
            type="button"
            variant="ghost"
          >
            <ArrowLeftIcon />
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-slate-950 dark:text-neutral-50">
              {t("settings.title")}
            </h1>
          </div>
        </header>

        <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-6">
            <h2 className="mt-1 text-base text-slate-500 dark:text-neutral-400">
              {t("settings.description")}
            </h2>
          </div>

          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <label
                className="text-sm font-medium"
                htmlFor="settings-server-address"
              >
                {t("authentication.serverAddressLabel")}
              </label>
              <div className="relative">
                <Input
                  autoComplete="url"
                  className="pr-9"
                  id="settings-server-address"
                  onChange={(event) => {
                    const value = event.target.value;
                    setServerAddress(value);
                    setError(null);
                    setSaved(false);
                    try {
                      const parsed = new URL(value);
                      if (parsed.port) setPort(parsed.port);
                    } catch {
                      // Keep editing partial URLs without interrupting input.
                    }
                  }}
                  placeholder={t("authentication.serverAddressPlaceholder")}
                  required
                  type="text"
                  value={serverAddress}
                />
                <ClearInputButton
                  label={t("authentication.clearField")}
                  onClick={() => {
                    setServerAddress("");
                    setError(null);
                    setSaved(false);
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label
                className="text-sm font-medium"
                htmlFor="settings-server-port"
              >
                {t("authentication.portLabel")}
              </label>
              <div className="relative">
                <Input
                  className="pr-9"
                  id="settings-server-port"
                  inputMode="numeric"
                  max={65535}
                  min={1}
                  onChange={(event) => {
                    setPort(event.target.value);
                    setError(null);
                    setSaved(false);
                  }}
                  placeholder={t("authentication.portPlaceholder")}
                  required
                  type="number"
                  value={port}
                />
                <ClearInputButton
                  label={t("authentication.clearField")}
                  onClick={() => {
                    setPort("");
                    setError(null);
                    setSaved(false);
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label
                className="text-sm font-medium"
                htmlFor="settings-server-password"
              >
                {t("authentication.passwordLabel")}
              </label>
              <div className="relative">
                <Input
                  autoComplete="current-password"
                  className="pr-9"
                  id="settings-server-password"
                  onChange={(event) => {
                    setStoredPassword(event.target.value);
                    setError(null);
                    setSaved(false);
                  }}
                  placeholder={t("authentication.passwordPlaceholder")}
                  required
                  type="password"
                  value={formPassword}
                />
                <ClearInputButton
                  label={t("authentication.clearField")}
                  onClick={() => {
                    setStoredPassword(null);
                    setError(null);
                    setSaved(false);
                  }}
                />
              </div>
            </div>

            {error ? (
              <p
                aria-live="polite"
                className="text-sm text-destructive"
                role="alert"
              >
                {t(`settings.${error}`)}
              </p>
            ) : null}
            {saved ? (
              <p
                aria-live="polite"
                className="text-sm text-emerald-700 dark:text-emerald-300"
                role="status"
              >
                {t("settings.saved")}
              </p>
            ) : null}

            <div className="flex justify-end">
              <Button disabled={isSaving} type="submit">
                {isSaving ? t("settings.saving") : t("settings.save")}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

function ClearInputButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      aria-label={label}
      className="absolute top-1/2 right-1 -translate-y-1/2"
      onClick={onClick}
      size="icon-sm"
      type="button"
      variant="ghost"
    >
      <XIcon />
    </Button>
  );
}
