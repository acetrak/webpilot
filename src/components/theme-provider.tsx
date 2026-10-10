import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getExtensionStorageItem,
  setExtensionStorageItem,
} from "@/lib/extension-storage";

export type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  rootElement?: HTMLElement | null;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeProviderContext = createContext<ThemeProviderState | null>(null);

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "webpilot.theme",
  rootElement,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  useEffect(() => {
    let active = true;
    void getExtensionStorageItem(storageKey)
      .then((storedTheme) => {
        if (active) setThemeState(isTheme(storedTheme) ? storedTheme : defaultTheme);
      })
      .catch(() => {
        if (active) setThemeState(defaultTheme);
      });

    return () => {
      active = false;
    };
  }, [defaultTheme, storageKey]);

  useEffect(() => {
    const root = rootElement === undefined ? window.document.documentElement : rootElement;
    if (!root) return;
    const applyTheme = (dark: boolean) => {
      root.classList.toggle("dark", dark);
      root.classList.toggle("light", !dark);
    };

    if (theme !== "system") {
      applyTheme(theme === "dark");
      return;
    }

    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = () => applyTheme(systemTheme.matches);
    updateSystemTheme();
    systemTheme.addEventListener("change", updateSystemTheme);
    return () => systemTheme.removeEventListener("change", updateSystemTheme);
  }, [rootElement, theme]);

  const setTheme = useCallback(
    (nextTheme: Theme) => {
      void setExtensionStorageItem(storageKey, nextTheme).catch(() => undefined);
      setThemeState(nextTheme);
    },
    [storageKey],
  );

  const value = useMemo(() => ({ theme, setTheme }), [setTheme, theme]);

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeProviderContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
