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
import { TooltipHint } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  CheckIcon,
  ChevronDownIcon,
  PlusIcon,
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
  onAddWebsite: () => void;
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
  onAddWebsite,
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
        <TooltipHint content={t("website.title")}>
          <button
            type="button"
            aria-label={t("website.add")}
            disabled={websiteLoading}
            onClick={onAddWebsite}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-70",
              websiteEnabled
                ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 dark:border-primary/40 dark:bg-primary/15 dark:text-primary dark:hover:bg-accent/20 dark:hover:text-primary"
                : "border-border/70 bg-background/80 text-muted-foreground hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/20 dark:hover:text-muted-foreground",
            )}
          >
            {websiteLoading ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />
            ) : (
              <PlusIcon className="size-3.5 shrink-0" />
            )}
            <span>{websiteLoading ? t("website.reading") : t("website.add")}</span>
          </button>
        </TooltipHint>
        {websiteError && (
          <TooltipHint content={websiteError} className="max-w-48">
            <span
              className="max-w-48 truncate px-2 text-[10px] text-destructive"
              role="status"
            >
              {t("website.retryError")}
            </span>
          </TooltipHint>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          type="button"
          aria-label={t("model.pickerAria")}
          className="inline-flex max-w-full items-center gap-2 self-start rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/20 dark:hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            <DropdownMenuSubTrigger className="w-full">
              <span>{t("model.effort")}</span>
              <span className="block flex-1"></span>
              <span className="text-xs text-muted-foreground block">
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
