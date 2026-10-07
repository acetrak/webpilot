/// <reference types="chrome" />

import { ClosePanelButton } from "@/components/close-panel-button";
import { ConnectionStatus } from "@/components/connection-status";
import { LanguagePicker } from "@/components/language-picker";
import { SessionList } from "@/components/session-list";
import { ThemePicker } from "@/components/theme-picker";
import { ThemeProvider } from "@/components/theme-provider";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { WorkspaceChat } from "@/components/workspace-chat";
import { interruptOpenCodeSession } from "@/lib/api/session";
import "@/lib/i18n";
import { useSessionWorkspaceStore } from "@/lib/stores/session-workspace";
import { PanelLeftIcon, PlusIcon, XIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import "./styles/index.css";

function IndexPopupContent() {
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const chats = useSessionWorkspaceStore((state) => state.chats);
  const activeChatID = useSessionWorkspaceStore((state) => state.activeChatID);
  const busyByChatID = useSessionWorkspaceStore((state) => state.busyByChatID);
  const createChat = useSessionWorkspaceStore((state) => state.createChat);
  const openSession = useSessionWorkspaceStore((state) => state.openSession);
  const removeSession = useSessionWorkspaceStore(
    (state) => state.removeSession,
  );
  chats.find((chat) => chat.id === activeChatID);

  const isBusy = Object.values(busyByChatID).some(Boolean);
  const handleConfirmClose = useCallback(async () => {
    const runningSessionIDs = chats.flatMap((chat) =>
      busyByChatID[chat.id] && chat.sessionID ? [chat.sessionID] : [],
    );
    await Promise.all(runningSessionIDs.map(interruptOpenCodeSession));
  }, [busyByChatID, chats]);

  const startNewChat = () => {
    createChat("新会话");
    setDrawerOpen(false);
  };
  const refreshHistory = useCallback(
    () => setHistoryRefreshKey((key) => key + 1),
    [],
  );

  return (
    <Drawer
      open={drawerOpen}
      onOpenChange={setDrawerOpen}
      swipeDirection="left"
    >
      <main className="h-dvh w-full bg-slate-50 text-slate-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
        <div className="mx-auto flex h-full min-h-0 flex-col px-4 py-4">
          <header className="mb-7">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DrawerTrigger
                  type="button"
                  aria-label={t("navigation.openMenu")}
                  title={t("navigation.openMenu")}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  <PanelLeftIcon className="h-4 w-4" />
                </DrawerTrigger>

                <div>
                  <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-slate-950 dark:text-neutral-50">
                    {t("app.title")}
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ThemePicker />
                <LanguagePicker />
                <ClosePanelButton
                  isBusy={isBusy}
                  onConfirmClose={handleConfirmClose}
                />
              </div>
            </div>

            <p className="text-sm leading-6 text-slate-500 dark:text-neutral-400">
              {t("app.description")}
            </p>
          </header>

          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] dark:border-neutral-800 dark:bg-neutral-900">
            <div className="relative min-h-0 flex-1">
              {chats.map((chat) => (
                <WorkspaceChat
                  key={chat.id}
                  chat={chat}
                  onTitleChange={refreshHistory}
                />
              ))}
            </div>
          </section>

          <footer className="flex items-center gap-3 justify-center mt-auto pt-8 text-center text-[11px] text-slate-400 dark:text-neutral-500">
            {t("app.footer")}
            <div className=" ">
              <ConnectionStatus />
            </div>
          </footer>
        </div>
      </main>
      <DrawerContent
        className="left-0 right-auto m-0 h-dvh max-h-dvh w-[min(24rem,85vw)] rounded-none border-y-0 border-l-0"
        style={{
          width: "min(24rem, 85vw)",
          height: "100dvh",
          maxHeight: "100dvh",
          margin: 0,
        }}
      >
        <DrawerHeader className="!flex-row items-center justify-between gap-3 border-b border-border p-4 pb-4 text-left">
          <DrawerTitle className="text-lg font-semibold">WebPilot</DrawerTitle>
          <DrawerClose
            type="button"
            aria-label={t("navigation.closeMenu")}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <XIcon className="h-4 w-4" />
          </DrawerClose>
        </DrawerHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-5 p-4">
          <DrawerClose
            type="button"
            onClick={startNewChat}
            className="inline-flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-foreground transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <PlusIcon className="h-4 w-4" />
            </span>
            {t("navigation.newSession")}
          </DrawerClose>

          <section className="flex min-h-0 flex-1 flex-col">
            <h2 className="mb-3 px-3 text-xs font-medium text-muted-foreground">
              {t("navigation.history")}
            </h2>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {drawerOpen && (
                <SessionList
                  onDelete={removeSession}
                  refreshKey={historyRefreshKey}
                  onSelect={(session) => {
                    openSession(session);
                    setDrawerOpen(false);
                  }}
                />
              )}
            </div>
          </section>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function IndexPopup() {
  return (
    <ThemeProvider>
      <IndexPopupContent />
    </ThemeProvider>
  );
}

export default IndexPopup;
