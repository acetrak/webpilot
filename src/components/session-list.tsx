import { useEffect, useState } from "react";
import {
  deleteOpenCodeSession,
  getOpenCodeSessionDisplayTitle,
  getGenericOpenCodeSessionTitleKind,
  listOpenCodeSessions,
  type OpenCodeSession,
} from "@/lib/api/session";
import { useTranslation } from "react-i18next";

type SessionListProps = {
  onSelect: (session: OpenCodeSession) => void;
  onDelete: (sessionID: string) => void;
  refreshKey?: number;
};

function formatUpdatedAt(timestamp: number, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function SessionList({
  onSelect,
  onDelete,
  refreshKey = 0,
}: SessionListProps) {
  const { i18n, t } = useTranslation();
  const [attempt, setAttempt] = useState(0);
  const [sessions, setSessions] = useState<OpenCodeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingSessionID, setDeletingSessionID] = useState<string | null>(
    null,
  );
  const [deleteError, setDeleteError] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    listOpenCodeSessions()
      .then((items) => {
        if (active) setSessions(items);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error ? cause.message : t("session.loadError"),
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [attempt, refreshKey, t]);

  const removeSession = async (session: OpenCodeSession) => {
    const sessionTitle = getOpenCodeSessionDisplayTitle(session.title);
    const titleKind = getGenericOpenCodeSessionTitleKind(session.title);
    const title =
      titleKind === "new"
        ? t("session.newTitle")
        : titleKind === "untitled"
          ? t("session.unnamedTitle")
          : sessionTitle;
    const confirmed = window.confirm(
      t("session.confirmDelete", { title }),
    );
    if (!confirmed) return;

    setDeletingSessionID(session.id);
    setDeleteError("");
    try {
      await deleteOpenCodeSession(session.id);
      setSessions((current) =>
        current.filter((item) => item.id !== session.id),
      );
      onDelete(session.id);
    } catch (cause) {
      setDeleteError(
        cause instanceof Error ? cause.message : t("session.deleteError"),
      );
    } finally {
      setDeletingSessionID(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500 dark:text-neutral-400">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-r-transparent" />
        {t("session.loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
        role="alert"
      >
        <p>{error}</p>
        <button
          className="mt-3 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-rose-800 shadow-sm ring-1 ring-rose-200 hover:bg-rose-100 dark:bg-neutral-900 dark:text-rose-200 dark:ring-rose-900 dark:hover:bg-rose-950/50"
          onClick={() => setAttempt((value) => value + 1)}
          type="button"
        >
          {t("session.retry")}
        </button>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-5 py-10 text-center dark:border-neutral-700 dark:bg-neutral-900/50">
        <p className="text-sm font-medium text-slate-700 dark:text-neutral-200">
          {t("session.emptyTitle")}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
          {t("session.emptyDescription")}
        </p>
      </div>
    );
  }

  return (
    <div>
      {deleteError ? (
        <p
          className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
          role="alert"
        >
          {deleteError}
        </p>
      ) : null}
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
        {sessions.map((session) => {
          const titleKind = getGenericOpenCodeSessionTitleKind(session.title);
          const title =
            titleKind === "new"
              ? t("session.newTitle")
              : titleKind === "untitled"
                ? t("session.unnamedTitle")
                : getOpenCodeSessionDisplayTitle(session.title);
          return (
            <li className="flex items-center" key={session.id}>
              <button
                className="group flex min-w-0 flex-1 items-center gap-3 px-4 py-4 text-left transition hover:bg-emerald-50/60 focus:bg-emerald-50/60 focus:outline-none dark:hover:bg-emerald-950/40 dark:focus:bg-emerald-950/40"
                onClick={() => onSelect(session)}
                type="button"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition group-hover:bg-emerald-100 group-hover:text-emerald-700 dark:bg-neutral-800 dark:text-neutral-300 dark:group-hover:bg-emerald-900 dark:group-hover:text-emerald-200">
                  <svg
                    aria-hidden="true"
                    className="h-[18px] w-[18px]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 10h8M8 14h5m-7 6 2.5-2H18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12l2-2Z"
                    />
                  </svg>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-800 group-hover:text-emerald-900 dark:text-neutral-100 dark:group-hover:text-emerald-200">
                    {title}
                  </span>
                  <span className="mt-1 flex min-w-0 items-center gap-2 text-xs text-slate-400 dark:text-neutral-500">
                    <time
                      className="shrink-0"
                      dateTime={new Date(session.time.updated).toISOString()}
                    >
                      {formatUpdatedAt(
                        session.time.updated,
                        i18n.resolvedLanguage ?? i18n.language,
                      )}
                    </time>

                    {/*{session.model ? (*/}
                    {/*  <>*/}
                    {/*    <span aria-hidden="true">·</span>*/}
                    {/*    <span className="truncate">{session.model.id}</span>*/}
                    {/*  </>*/}
                    {/*) : null}*/}
                  </span>
                </span>
                <svg
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-600 dark:text-neutral-600 dark:group-hover:text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m9 5 7 7-7 7"
                  />
                </svg>
              </button>
              <button
                aria-label={t("session.deleteAria", { title })}
                className="mr-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 disabled:cursor-wait disabled:opacity-50 dark:text-neutral-500 dark:hover:bg-rose-950/50 dark:hover:text-rose-300"
                disabled={deletingSessionID !== null}
                onClick={() => removeSession(session)}
                type="button"
              >
                {deletingSessionID === session.id ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-rose-500 border-r-transparent" />
                ) : (
                  <svg
                    aria-hidden="true"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.75 7.5h14.5m-9.5 0V5.75h4.5V7.5m-7.5 0 .75 12h8.5l.75-12m-6.5 3.5v5m3-5v5"
                    />
                  </svg>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
