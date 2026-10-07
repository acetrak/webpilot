import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  OpenCodeModelCatalog,
  OpenCodeModelSelection,
} from "@/lib/api/session";
import {
  CheckIcon,
  ChevronDownIcon,
  GlobeIcon,
  SparklesIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

type ModelPickerProps = {
  catalog: OpenCodeModelCatalog;
  selection: OpenCodeModelSelection;
  isLoading: boolean;
  error: string;
  onModelChange: (model: OpenCodeModelSelection) => void;
  onVariantChange: (variant: string | undefined) => void;
  onRetry: () => void;
  websiteEnabled: boolean;
  websiteLoading: boolean;
  websiteError: string;
  onToggleWebsite: () => void;
};

function formatVariant(
  variant: string | undefined,
  labels: Record<string, string>,
  defaultLabel: string,
) {
  if (!variant) return defaultLabel;
  return labels[variant.toLowerCase()] ?? variant.charAt(0).toUpperCase() + variant.slice(1);
}

export function ModelPicker({
  catalog,
  selection,
  isLoading,
  error,
  onModelChange,
  onVariantChange,
  onRetry,
  websiteEnabled,
  websiteLoading,
  websiteError,
  onToggleWebsite,
}: ModelPickerProps) {
  const { t } = useTranslation();
  const selectedModel = catalog.models.find(
    (model) =>
      model.id === selection.id && model.providerID === selection.providerID,
  );
  const providerNames = new Map(
    catalog.providers.map((provider) => [provider.id, provider.name]),
  );
  const modelGroups = new Map<
    string,
    { providerID: string; name: string; models: typeof catalog.models }
  >();

  for (const model of catalog.models) {
    if (!model.enabled || model.status === "deprecated") continue;

    const group = modelGroups.get(model.providerID) ?? {
      providerID: model.providerID,
      name: providerNames.get(model.providerID) ?? model.providerID,
      models: [],
    };
    group.models.push(model);
    modelGroups.set(model.providerID, group);
  }

  const modelName = selectedModel?.name ?? selection.id;
  const providerName =
    providerNames.get(selection.providerID) ?? selection.providerID;
  const variants = selectedModel?.variants ?? [];
  const variantLabels: Record<string, string> = {
    minimal: t("model.minimal"),
    low: t("model.low"),
    medium: t("model.medium"),
    med: t("model.medium"),
    high: t("model.high"),
    max: t("model.max"),
  };
  const selectedVariant = formatVariant(
    selection.variant,
    variantLabels,
    t("model.default"),
  );

  return (
    <div className="flex min-w-0 items-center justify-between gap-2">
      <div className="flex min-w-0 flex-col gap-1">
        <button
          type="button"
          aria-pressed={websiteEnabled}
          aria-label={websiteEnabled ? t("website.stop") : t("website.use")}
          title={websiteError || t("website.title")}
          disabled={websiteLoading}
          onClick={onToggleWebsite}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-70 ${
            websiteEnabled
              ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-900"
              : "border-border/70 bg-background/80 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          }`}
        >
          {websiteLoading ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />
          ) : (
            <GlobeIcon className="size-3.5 shrink-0" />
          )}
          <span>{websiteLoading ? t("website.reading") : t("website.use")}</span>
          {websiteEnabled && !websiteLoading && (
            <CheckIcon className="size-3.5 shrink-0" />
          )}
        </button>
        {websiteError && (
          <span
            className="max-w-48 truncate px-2 text-[10px] text-destructive"
            role="status"
            title={websiteError}
          >
            {t("website.retryError")}
          </span>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          type="button"
          aria-label={t("model.pickerAria")}
          className="inline-flex max-w-full items-center gap-2 self-start rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <SparklesIcon className="size-3.5 shrink-0" />
          <span className="max-w-40 truncate font-medium text-foreground">
            {modelName}
          </span>
          <span className="shrink-0">{selectedVariant}</span>
          <ChevronDownIcon className="size-3.5 shrink-0" />
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          side="top"
          style={{ width: "min(18rem, calc(100vw - 1.5rem))" }}
        >
          <DropdownMenuItem
            className="min-h-14 items-start py-2"
            onClick={() => onModelChange(selection)}
          >
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate font-medium text-foreground">
                {modelName}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {providerName} · {selectedModel?.modelID ?? selection.id}
              </span>
            </span>
            <CheckIcon className="mt-1 size-4 shrink-0 text-primary" />
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="w-full justify-between">
              <span>{t("model.effort")}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {selectedVariant}
              </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent
              align="start"
              side="top"
              style={{ width: "min(13rem, calc(100vw - 1.5rem))" }}
            >
              <DropdownMenuItem onClick={() => onVariantChange(undefined)}>
                <span>{t("model.default")}</span>
                {!selection.variant && (
                  <CheckIcon className="ml-auto size-4 text-primary" />
                )}
              </DropdownMenuItem>
              {variants.length > 0 ? (
                variants.map((variant) => (
                  <DropdownMenuItem
                    key={variant.id}
                    onClick={() => onVariantChange(variant.id)}
                  >
                    <span>
                      {formatVariant(
                        variant.id,
                        variantLabels,
                        t("model.default"),
                      )}
                    </span>
                    {selection.variant === variant.id && (
                      <CheckIcon className="ml-auto size-4 text-primary" />
                    )}
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>
                  {t("model.noEffortOptions")}
                </DropdownMenuItem>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="w-full">
              {t("model.more")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent
              align="start"
              side="top"
              style={{ width: "min(18rem, calc(100vw - 1.5rem))" }}
            >
              {isLoading && (
                <DropdownMenuItem disabled>{t("model.loading")}</DropdownMenuItem>
              )}
              {error && (
                <>
                  <DropdownMenuItem
                    disabled
                    className="h-auto whitespace-normal text-xs text-destructive"
                  >
                    {t("model.loadError", { message: error })}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onRetry}>
                    {t("model.retry")}
                  </DropdownMenuItem>
                </>
              )}
              {!isLoading && !error && modelGroups.size === 0 && (
                <DropdownMenuItem disabled>
                  {t("model.noneAvailable")}
                </DropdownMenuItem>
              )}
              {!isLoading &&
                !error &&
                Array.from(modelGroups.values()).map((group) => (
                  <DropdownMenuGroup key={group.providerID}>
                    <DropdownMenuLabel>{group.name}</DropdownMenuLabel>
                    {group.models.map((model) => {
                      const isSelected =
                        model.id === selection.id &&
                        model.providerID === selection.providerID;

                      return (
                        <DropdownMenuItem
                          key={`${model.providerID}/${model.id}`}
                          onClick={() =>
                            onModelChange({
                              id: model.id,
                              providerID: model.providerID,
                            })
                          }
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {model.name}
                          </span>
                          {isSelected && (
                            <CheckIcon className="size-4 shrink-0 text-primary" />
                          )}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuGroup>
                ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
