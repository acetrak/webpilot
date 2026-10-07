import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LANGUAGES } from "@/lib/i18n";
import { CheckIcon, LanguagesIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

export function LanguagePicker() {
  const { i18n, t } = useTranslation();
  const currentLanguage = LANGUAGES.find(
    ({ code }) => code === i18n.resolvedLanguage,
  )?.code;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        aria-label={t("language.label")}
        title={t("language.label")}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        <LanguagesIcon className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("language.label")}</DropdownMenuLabel>
          {LANGUAGES.map(({ code, label }) => (
            <DropdownMenuItem
              key={code}
              onClick={() => {
                void i18n.changeLanguage(code);
              }}
            >
              <span>{label}</span>
              {currentLanguage === code && (
                <CheckIcon className="ml-auto size-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
