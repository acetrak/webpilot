import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifyOpenCodeCredentials } from "@/lib/api/session";
import {
  buildOpenCodeBaseUrl,
  configureOpenCodeEndpoint,
} from "@/lib/opencode-endpoint";
import { useOpenCodeAuthStore } from "@/lib/stores/opencode-auth";
import { XIcon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

export function OpenCodePasswordDialog() {
  const { t } = useTranslation();
  const baseUrl = useOpenCodeAuthStore((state) => state.baseUrl);
  const serverAddress = useOpenCodeAuthStore((state) => state.serverAddress);
  const port = useOpenCodeAuthStore((state) => state.port);
  const password = useOpenCodeAuthStore((state) => state.password) ?? "";
  const dialogOpen = useOpenCodeAuthStore((state) => state.dialogOpen);
  const isVerifying = useOpenCodeAuthStore((state) => state.isVerifying);
  const verificationError = useOpenCodeAuthStore(
    (state) => state.verificationError,
  );
  const startVerification = useOpenCodeAuthStore(
    (state) => state.startVerification,
  );
  const markAuthenticated = useOpenCodeAuthStore(
    (state) => state.markAuthenticated,
  );
  const failVerification = useOpenCodeAuthStore(
    (state) => state.failVerification,
  );
  const setPassword = useOpenCodeAuthStore((state) => state.setPassword);
  const setServerAddress = useOpenCodeAuthStore(
    (state) => state.setServerAddress,
  );
  const setPort = useOpenCodeAuthStore((state) => state.setPort);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!password) return;

    const nextBaseUrl = buildOpenCodeBaseUrl(serverAddress, port);
    if (!nextBaseUrl) {
      setFormError("invalidEndpoint");
      return;
    }

    setFormError(null);
    startVerification(password, nextBaseUrl);
    try {
      const hasPermission = await configureOpenCodeEndpoint(nextBaseUrl);
      if (!hasPermission) {
        failVerification("permissionDenied");
        return;
      }
      await verifyOpenCodeCredentials();
      markAuthenticated();
    } catch {
      const authState = useOpenCodeAuthStore.getState();
      if (authState.verificationError !== "invalid") {
        failVerification();
      }
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={() => undefined}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
        showCloseButton={false}
      >
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("authentication.title")}</DialogTitle>
            <DialogDescription>
              {t("authentication.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5 rounded-md border border-border bg-muted/50 px-3 py-2.5">
            <p className="text-xs font-medium text-muted-foreground">
              {t("authentication.serveCommandLabel")}
            </p>
            <code className="break-all font-mono text-xs leading-relaxed text-foreground">
              opencode serve --hostname 127.0.0.1 --port 4096
            </code>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="login-server-address">
              {t("authentication.serverAddressLabel")}
            </label>
            <div className="relative">
              <Input
                autoComplete="url"
                className="pr-9"
                id="login-server-address"
                onChange={(event) => {
                  const value = event.target.value;
                  setServerAddress(value);
                  setFormError(null);
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
                  setFormError(null);
                }}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="login-server-port">
              {t("authentication.portLabel")}
            </label>
            <div className="relative">
              <Input
                className="pr-9"
                id="login-server-port"
                inputMode="numeric"
                max={65535}
                min={1}
                onChange={(event) => {
                  setPort(event.target.value);
                  setFormError(null);
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
                  setFormError(null);
                }}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="opencode-password">
              {t("authentication.passwordLabel")}
            </label>
            <div className="relative">
              <Input
                autoComplete="current-password"
                autoFocus
                className="pr-9"
                id="opencode-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t("authentication.passwordPlaceholder")}
                required
                type="password"
                value={password}
              />
              <ClearInputButton
                label={t("authentication.clearField")}
                onClick={() => setPassword("")}
              />
            </div>
            {formError || verificationError ? (
              <p
                aria-live="polite"
                className="text-sm text-destructive"
                role="alert"
              >
                {t(`authentication.${formError ?? verificationError}`)}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button disabled={isVerifying || !password} type="submit">
              {isVerifying
                ? t("authentication.verifying")
                : t("authentication.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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