import { useEffect, useState } from "react";
import { checkOpenCodeConnection } from "@/lib/api/session";
import { useOpenCodeAuthStore } from "@/lib/stores/opencode-auth";
import { TooltipHint } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type ConnectionState =
  | { status: "checking" }
  | { status: "connected"; version: string }
  | { status: "disconnected" };

export function ConnectionStatus() {
  const { t } = useTranslation();
  const baseUrl = useOpenCodeAuthStore((state) => state.baseUrl);
  const [attempt, setAttempt] = useState(0);
  const [connection, setConnection] = useState<ConnectionState>({
    status: "checking",
  });

  useEffect(() => {
    let active = true;

    checkOpenCodeConnection()
      .then((server) => {
        if (active) {
          setConnection({ status: "connected", version: server.version });
        }
      })
      .catch(() => {
        if (active) setConnection({ status: "disconnected" });
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  const isConnected = connection.status === "connected";
  const isChecking = connection.status === "checking";

  return (
    <div
      aria-live="polite"
      className={cn(
        "flex max-w-[12rem] items-center gap-2 rounded-full border py-1.5 px-1.5",
        isConnected &&
          "border-emerald-100 bg-white text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200",
        isChecking &&
          "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200",
        !isConnected &&
          !isChecking &&
          "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200",
      )}
      role="status"
    >
      <TooltipHint
        className="min-w-0 flex-1"
        content={t("connection.openServer")}
      >
        <a
          aria-label={`${
            isConnected
              ? t("connection.connected", { version: connection.version })
              : isChecking
                ? t("connection.checking")
                : t("connection.disconnected")
          } · ${t("connection.openServer")}`}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href={baseUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          <span
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              isConnected && "bg-emerald-500",
              isChecking && "animate-pulse bg-amber-500",
              !isConnected && !isChecking && "bg-rose-500",
            )}
          />
          <span className="min-w-0 truncate text-[11px] font-medium">
            {isConnected
              ? t("connection.connected", { version: connection.version })
              : isChecking
                ? t("connection.checking")
                : t("connection.disconnected")}
          </span>
        </a>
      </TooltipHint>
      {connection.status === "disconnected" ? (
        <button
          aria-label={t("connection.retryAria")}
          className="shrink-0 rounded-full px-1 font-semibold underline decoration-rose-300 underline-offset-2 hover:text-rose-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:decoration-rose-700 dark:hover:text-rose-100"
          onClick={() => {
            setConnection({ status: "checking" });
            setAttempt((value) => value + 1);
          }}
          type="button"
        >
          {t("connection.retry")}
        </button>
      ) : null}
    </div>
  );
}
