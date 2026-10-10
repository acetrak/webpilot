import { useState } from "react";
import { TooltipHint } from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";

type ClosePanelButtonProps = {
  isBusy: boolean;
  onConfirmClose: () => void | Promise<void>;
};

export function ClosePanelButton({
  isBusy,
  onConfirmClose,
}: ClosePanelButtonProps) {
  const { t } = useTranslation();
  const [closing, setClosing] = useState(false);

  const closePanel = async () => {
    if (
      isBusy &&
      !window.confirm(
        t("closePanel.confirmBusy"),
      )
    ) {
      return;
    }

    setClosing(true);
    try {
      if (isBusy) {
        await onConfirmClose();
      }

      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab?.windowId === undefined) {
        throw new Error(t("closePanel.currentWindowError"));
      }
      await chrome.sidePanel.close({ windowId: tab.windowId });
    } catch (cause) {
      window.alert(
        cause instanceof Error
          ? t("closePanel.failedWithMessage", { message: cause.message })
          : t("closePanel.failedFallback"),
      );
    } finally {
      setClosing(false);
    }
  };

  return (
    <TooltipHint content={t("closePanel.label")} side="bottom">
      <button
        aria-label={t("closePanel.label")}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 disabled:cursor-wait disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-rose-900 dark:hover:bg-rose-950/50 dark:hover:text-rose-300"
        disabled={closing}
        onClick={closePanel}
        type="button"
      >
        {closing ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-r-transparent dark:border-neutral-500" />
        ) : (
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m6 6 12 12M18 6 6 18"
            />
          </svg>
        )}
      </button>
    </TooltipHint>
  );
}
