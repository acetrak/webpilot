import type { OpenCodeUsage } from "@/lib/api/session";
import { useAuiState } from "@assistant-ui/react";
import { CoinsIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

const CREDITS_PER_USD = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isOpenCodeUsage(value: unknown): value is OpenCodeUsage {
  if (!isRecord(value)) return false;

  const costIsValid =
    typeof value.cost === "number" && Number.isFinite(value.cost);
  const tokens = value.tokens;
  const tokensAreValid =
    isRecord(tokens) &&
    isRecord(tokens.cache) &&
    Number.isFinite(tokens.input) &&
    Number.isFinite(tokens.output) &&
    Number.isFinite(tokens.reasoning) &&
    Number.isFinite(tokens.cache.read) &&
    Number.isFinite(tokens.cache.write);

  return costIsValid || tokensAreValid;
}

function formatCredits(usdCost: number, locale: string, unit: string) {
  const credits = usdCost * CREDITS_PER_USD;
  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 4,
  }).format(credits);

  return `${formatted} ${unit}`;
}

export function MessageUsage() {
  const { i18n, t } = useTranslation();
  const value = useAuiState(
    (state) => state.message.metadata.custom?.openCodeUsage,
  );
  if (!isOpenCodeUsage(value)) return null;

  const tokens = value.tokens;
  const locale = i18n.resolvedLanguage ?? i18n.language;

  return (
    <div
      className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-sm text-muted-foreground"
      aria-label={t("usage.ariaLabel")}
      title={t("usage.title")}
    >
      <span className="inline-flex items-center gap-1">
        <CoinsIcon className="size-3.5" aria-hidden="true" />
        {t("usage.label")}
      </span>
      {tokens && (
        <span>
          {t("usage.input")} {tokens.input.toLocaleString(locale)} ·{" "}
          {t("usage.output")} {tokens.output.toLocaleString(locale)} tokens
        </span>
      )}
      {tokens && tokens.reasoning > 0 && (
        <span>
          {t("usage.reasoning")} {tokens.reasoning.toLocaleString(locale)} tokens
        </span>
      )}
      {value.cost !== undefined && (
        <span>
          {t("usage.cost")}{" "}
          {formatCredits(value.cost, locale, t("usage.credits"))}
        </span>
      )}
    </div>
  );
}
