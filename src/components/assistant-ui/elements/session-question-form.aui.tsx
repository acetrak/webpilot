import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TooltipHint } from "@/components/ui/tooltip";
import {
  cancelOpenCodeSessionForm,
  replyOpenCodeSessionForm,
  type OpenCodeFormAnswer,
  type OpenCodeSessionForm,
} from "@/lib/api/session";
import { useState, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

type FormValues = Record<string, string | number | boolean | string[]>;
type OpenCodeFormField = OpenCodeSessionForm["fields"][number];

function initialValues(fields: OpenCodeSessionForm["fields"]): FormValues {
  const values: FormValues = {};
  for (const field of fields) {
    if (field.type === "external") continue;
    if (field.type === "boolean") {
      values[field.key] = field.default ?? false;
    } else if (field.type === "multiselect") {
      values[field.key] = field.default ?? [];
    } else {
      values[field.key] = field.default ?? "";
    }
  }
  return values;
}

function isVisible(field: OpenCodeFormField, values: FormValues) {
  if (field.type === "external") return true;
  if (field.hidden) return false;
  return (field.when ?? []).every((condition) => {
    const value = values[condition.key];
    const matches = Array.isArray(value)
      ? value.includes(String(condition.value))
      : value === condition.value;
    return condition.op === "eq" ? matches : !matches;
  });
}

function isMissingRequiredValue(
  field: OpenCodeFormField,
  value: FormValues[string] | undefined,
) {
  if (field.type === "external" || !field.required) return false;
  if (field.type === "boolean") return false;
  if (field.type === "multiselect") {
    return (
      !Array.isArray(value) ||
      value.length < (field.minItems ?? 1)
    );
  }
  return value === undefined || value === "";
}

function OptionDescriptionTooltip({
  description,
  children,
}: {
  description?: string;
  children: ReactNode;
}) {
  if (!description) return children;
  return <TooltipHint content={description}>{children}</TooltipHint>;
}

function fieldControl(
  field: OpenCodeFormField,
  id: string,
  value: FormValues[string] | undefined,
  setValue: (value: FormValues[string]) => void,
  t: (key: string) => string,
): ReactNode {
  if (field.type === "external") {
    let url: URL;
    try {
      url = new URL(field.url);
    } catch {
      return <p className="text-sm text-destructive">{t("form.invalidLink")}</p>;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return <p className="text-sm text-destructive">{t("form.invalidLink")}</p>;
    }
    return (
      <a
        className="text-sm text-primary underline underline-offset-2"
        href={field.url}
        rel="noopener noreferrer"
        target="_blank"
      >
        {field.title ?? field.url}
      </a>
    );
  }

  if (field.type === "boolean") {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input
          checked={Boolean(value)}
          className="size-4 accent-primary"
          onChange={(event) => setValue(event.target.checked)}
          type="checkbox"
        />
        {field.description ?? field.title ?? field.key}
      </label>
    );
  }

  if (field.type === "multiselect") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <fieldset className="flex flex-col gap-2">
        {field.options.map((option) => {
          const checked = selected.includes(option.value);
          const atLimit =
            field.maxItems !== undefined &&
            selected.length >= field.maxItems &&
            !checked;
          return (
            <OptionDescriptionTooltip
              key={option.value}
              description={option.description}
            >
              <label className="flex items-start gap-2 text-sm">
                <input
                  checked={checked}
                  className="mt-0.5 size-4 accent-primary"
                  disabled={atLimit}
                  onChange={() =>
                    setValue(
                      checked
                        ? selected.filter((item) => item !== option.value)
                        : [...selected, option.value],
                    )
                  }
                  type="checkbox"
                />
                <span>{option.label}</span>
              </label>
            </OptionDescriptionTooltip>
          );
        })}
      </fieldset>
    );
  }

  if (field.type === "string" && field.options?.length) {
    return (
      <div className="flex flex-col gap-3">
        <fieldset className="flex flex-col gap-2">
          {field.options.map((option) => (
            <OptionDescriptionTooltip
              key={option.value}
              description={option.description}
            >
              <label className="flex items-start gap-2 text-sm">
                <input
                  checked={value === option.value}
                  className="mt-0.5 size-4 accent-primary"
                  name={`${field.key}-answer`}
                  onChange={() => setValue(option.value)}
                  type="radio"
                />
                <span>{option.label}</span>
              </label>
            </OptionDescriptionTooltip>
          ))}
        </fieldset>
        {field.custom ? (
          <Input
            id={id}
            onChange={(event) => setValue(event.target.value)}
            placeholder={t("form.customOption")}
            value={
              typeof value === "string" &&
              !field.options.some((option) => option.value === value)
                ? value
                : ""
            }
          />
        ) : null}
      </div>
    );
  }

  const inputType =
    field.type === "number" || field.type === "integer"
      ? "number"
      : field.type === "string" && field.format === "email"
        ? "email"
        : field.type === "string" && field.format === "uri"
          ? "url"
          : field.type === "string" && field.format === "date"
            ? "date"
            : field.type === "string" && field.format === "date-time"
              ? "datetime-local"
              : "text";

  return (
    <Input
      autoComplete={field.type === "string" ? field.format : undefined}
      id={id}
      max={field.type === "number" || field.type === "integer" ? field.maximum : undefined}
      maxLength={field.type === "string" ? field.maxLength : undefined}
      min={field.type === "number" || field.type === "integer" ? field.minimum : undefined}
      minLength={field.type === "string" ? field.minLength : undefined}
      onChange={(event) =>
        setValue(
          inputType === "number" && event.target.value !== ""
            ? Number(event.target.value)
            : event.target.value,
        )
      }
      pattern={field.type === "string" ? field.pattern : undefined}
      placeholder={field.type === "string" ? field.placeholder : undefined}
      required={field.required}
      step={field.type === "integer" ? 1 : "any"}
      type={inputType}
      value={value === undefined ? "" : String(value)}
    />
  );
}

export function SessionQuestionForm({
  sessionID,
  form,
  onResolved,
}: {
  sessionID: string;
  form: OpenCodeSessionForm;
  onResolved: (formID: string) => void;
}) {
  const { t } = useTranslation();
  const [values, setValues] = useState<FormValues>(() =>
    initialValues(form.fields),
  );
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const visibleFields = form.fields.filter((field) => isVisible(field, values));
    const missing = visibleFields.find((field) =>
      isMissingRequiredValue(field, values[field.key]),
    );
    if (missing) {
      setError(t("form.required"));
      return;
    }

    const answer: Record<string, OpenCodeFormAnswer[string]> = {};
    for (const field of visibleFields) {
      if (field.type === "external") continue;
      const value = values[field.key];
      if (value === undefined || value === "") continue;
      if (field.type === "number" || field.type === "integer") {
        const number = Number(value);
        if (!Number.isFinite(number) || (field.type === "integer" && !Number.isInteger(number))) {
          setError(t("form.invalidNumber"));
          return;
        }
        answer[field.key] = number;
      } else {
        answer[field.key] = value;
      }
    }

    setIsSubmitting(true);
    setError("");
    try {
      await replyOpenCodeSessionForm(sessionID, form.id, answer);
      onResolved(form.id);
    } catch {
      setError(t("form.replyError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    setIsSubmitting(true);
    setError("");
    try {
      await cancelOpenCodeSessionForm(sessionID, form.id);
      onResolved(form.id);
    } catch {
      setError(t("form.cancelError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-background p-3">
      <h3 className="mb-3 text-sm font-medium text-foreground">{form.title}</h3>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {form.fields.filter((field) => isVisible(field, values)).map((field) => (
          <div key={field.key} className="flex flex-col gap-2">
            {field.type !== "boolean" && field.type !== "external" ? (
              <label className="text-sm font-medium" htmlFor={`${form.id}-${field.key}`}>
                {field.title ?? field.key}
                {field.required ? <span className="text-destructive"> *</span> : null}
              </label>
            ) : null}
            {field.description && field.type !== "boolean" ? (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            ) : null}
            {fieldControl(field, `${form.id}-${field.key}`, values[field.key], (value) => {
              setValues((current) => ({ ...current, [field.key]: value }));
              setError("");
            }, t)}
          </div>
        ))}
        {error ? (
          <p aria-live="polite" className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button
            disabled={isSubmitting}
            onClick={handleCancel}
            type="button"
            variant="outline"
          >
            {t("form.cancel")}
          </Button>
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? t("form.submitting") : t("form.submit")}
          </Button>
        </div>
      </form>
    </section>
  );
}
