
import { OpenCodePasswordDialog } from "@/pages/login/page";
import { OpenCodeSettingsPage } from "@/pages/setting/page";
import { HomePage } from "@/pages/home/page";
import { verifyOpenCodeCredentials } from "@/lib/api/session";
import { configureOpenCodeEndpoint } from "@/lib/opencode-endpoint";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "@/lib/i18n";
import { useEffect, useRef, useState } from "react";
import { useOpenCodeAuthStore } from "@/lib/stores/opencode-auth";
import { useTranslation } from "react-i18next";
import { animate } from "motion";
import { Route, Router, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { Toaster } from "@/components/ui/toast"
import "./styles/index.css";

type AppProps = {
  themeRoot?: HTMLElement | null;
};

function Routes() {
  const { t } = useTranslation();
  const hasHydrated = useOpenCodeAuthStore((state) => state.hasHydrated);
  const hasAuthenticated = useOpenCodeAuthStore(
    (state) => state.hasAuthenticated,
  );
  const dialogOpen = useOpenCodeAuthStore((state) => state.dialogOpen);
  const [location, setLocation] = useLocation();
  const isSettingsRoute = location === "/settings";
  const initialSettingsRoute = useRef(isSettingsRoute).current;
  const homeRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const [hasVisitedSettings, setHasVisitedSettings] =
    useState(isSettingsRoute);
  const [isCheckingSavedCredentials, setIsCheckingSavedCredentials] =
    useState(true);

  useEffect(() => {
    if (isSettingsRoute) setHasVisitedSettings(true);
  }, [isSettingsRoute]);

  useEffect(() => {
    if (!hasAuthenticated || !homeRef.current) return;
    const controls = animate(
      homeRef.current,
      { opacity: isSettingsRoute ? 0 : 1, x: isSettingsRoute ? -12 : 0 },
      { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
    );
    return () => controls.stop();
  }, [hasAuthenticated, isSettingsRoute]);

  useEffect(() => {
    if (!hasVisitedSettings || !settingsRef.current) return;
    const controls = animate(
      settingsRef.current,
      { opacity: isSettingsRoute ? 1 : 0, x: isSettingsRoute ? 0 : 16 },
      { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
    );
    return () => controls.stop();
  }, [hasVisitedSettings, isSettingsRoute]);

  useEffect(() => {
    if (!hasHydrated) return;
    let active = true;
    const authState = useOpenCodeAuthStore.getState();
    if (!authState.password) {
      setIsCheckingSavedCredentials(false);
      return () => {
        active = false;
      };
    }

    void (async () => {
      try {
        const hasPermission = await configureOpenCodeEndpoint(
          authState.baseUrl,
          { requestPermission: false },
        );
        if (!hasPermission) {
          useOpenCodeAuthStore.getState().failVerification("permissionDenied");
          return;
        }
        await verifyOpenCodeCredentials();
        useOpenCodeAuthStore.getState().markAuthenticated();
      } catch {
        if (
          useOpenCodeAuthStore.getState().verificationError !== "invalid"
        ) {
          useOpenCodeAuthStore.getState().failVerification();
        }
      } finally {
        if (active) setIsCheckingSavedCredentials(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [hasHydrated]);

  useEffect(() => {
    if (isCheckingSavedCredentials) return;
    if (dialogOpen && location !== "/login") {
      setLocation("/login");
    } else if (!dialogOpen && hasAuthenticated && location === "/login") {
      setLocation("/");
    }
  }, [dialogOpen, hasAuthenticated, isCheckingSavedCredentials, location, setLocation]);

  if (!hasHydrated || isCheckingSavedCredentials) {
    return (
      <main className="flex h-dvh items-center justify-center gap-2 bg-slate-50 text-sm text-slate-500 dark:bg-neutral-950 dark:text-neutral-400">
        <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
        {t("authentication.verifying")}
      </main>
    );
  }

  return (
    <div className="relative h-dvh overflow-hidden">
      {hasAuthenticated ? (
        <div
          ref={homeRef}
          aria-hidden={isSettingsRoute}
          className="absolute inset-0"
          style={{
            opacity: initialSettingsRoute ? 0 : 1,
            transform: `translateX(${initialSettingsRoute ? -12 : 0}px)`,
            pointerEvents: isSettingsRoute ? "none" : "auto",
          }}
        >
          <HomePage />
        </div>
      ) : null}
      <Route path="/login" component={OpenCodePasswordDialog} />
      {hasVisitedSettings ? (
        <div
          ref={settingsRef}
          aria-hidden={!isSettingsRoute}
          className="absolute inset-0 z-10"
          style={{
            opacity: initialSettingsRoute ? 1 : 0,
            transform: `translateX(${initialSettingsRoute ? 0 : 16}px)`,
            pointerEvents: isSettingsRoute ? "auto" : "none",
          }}
        >
            <OpenCodeSettingsPage />
        </div>
      ) : null}
    </div>
  );
}

function App({ themeRoot }: AppProps) {
  return (
    <ThemeProvider rootElement={themeRoot}>
      
      <TooltipProvider>
        <Router hook={useHashLocation}>
          <Routes />
        </Router>
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
