import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme, type Theme } from "@/components/theme-provider";
import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

const themes: Theme[] = ["light", "dark", "system"];

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const Icon =
    theme === "dark" ? MoonIcon : theme === "light" ? SunIcon : MonitorIcon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        aria-label={t("app.themeLabel")}
        title={t("app.themeLabel")}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        <Icon className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("app.themeLabel")}</DropdownMenuLabel>
          {themes.map((option) => (
            <DropdownMenuItem key={option} onClick={() => setTheme(option)}>
              <span>
                {option === "light"
                  ? t("app.themeLight")
                  : option === "dark"
                    ? t("app.themeDark")
                    : t("app.themeSystem")}
              </span>
              {theme === option && (
                <CheckIcon className="ml-auto size-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
