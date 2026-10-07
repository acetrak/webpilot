import { ConnectionStatus } from "@/components/connection-status";
import { ClosePanelButton } from "@/components/close-panel-button";
import { SessionList } from "@/components/session-list";
import type { OpenCodeSession } from "@/lib/api/session";
import { useTranslation } from "react-i18next";

type SessionBrowserProps = {
  isBusy: boolean;
  onConfirmClose: () => void | Promise<void>;
  onOpenSession: (session: OpenCodeSession) => void;
  onSessionDeleted: (sessionID: string) => void;
  onClose: () => void;
};

export function SessionBrowser({
  isBusy,
  onConfirmClose,
  onOpenSession,
  onSessionDeleted,
  onClose,
}: SessionBrowserProps) {
  const { t } = useTranslation();
  return (
    <main className="min-h-screen w-full bg-slate-50 text-slate-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
      <div className="mx-auto flex min-h-screen flex-col px-5 py-6 sm:px-6">
        <header className="mb-6">
          <div className="flex items-center justify-between gap-3">
            <button
              className="inline-flex min-w-0 items-center gap-2 rounded-lg py-1 text-left text-sm font-semibold text-slate-700 transition hover:text-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30 dark:text-neutral-300 dark:hover:text-emerald-300"
              onClick={onClose}
              type="button"
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m15 19-7-7 7-7"
                />
              </svg>
              <span className="truncate">{t("session.backToConversation")}</span>
            </button>
            <div className="flex items-center gap-2">
              <ConnectionStatus />
              <ClosePanelButton
                isBusy={isBusy}
                onConfirmClose={onConfirmClose}
              />
            </div>
          </div>

          <h1 className="mt-1 truncate text-xl font-semibold tracking-tight text-slate-950 dark:text-neutral-50">
            {t("session.historyTitle")}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
            {t("session.historyDescription")}
          </p>
        </header>

        <SessionList onDelete={onSessionDeleted} onSelect={onOpenSession} />

        <footer className="mt-auto pt-8 text-center text-[11px] text-slate-400 dark:text-neutral-500">
          {t("app.footer")}
        </footer>
      </div>
    </main>
  );
}
