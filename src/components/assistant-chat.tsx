import { Thread } from "@/components/assistant-ui/elements/thread.aui";
import {
  DEFAULT_OPENCODE_MODEL,
  createOpenCodeSession,
  getOpenCodeModelCatalog,
  getOpenCodeSessionModel,
  getOpenCodeSessionMessages,
  isGenericOpenCodeSessionTitle,
  streamOpenCodeMessage,
  updateOpenCodeSessionTitle,
  type OpenCodeModelCatalog,
  type OpenCodeModelSelection,
  type OpenCodeUsage,
} from "@/lib/api/session";
import { ModelPicker } from "@/components/model-picker";
import i18n from "@/lib/i18n";
import {
  extractActivePage,
  pageHtmlToMarkdown,
} from "@/lib/page-extractor";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ChatModelAdapter,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

type AssistantChatProps = {
  sessionID: string | null;
  title: string;
  initialPrompt?: string;
  onSessionCreated?: (sessionID: string) => void;
  onTitleChange?: (title: string) => void;
  onBusyChange?: (isBusy: boolean) => void;
  autoFocus?: boolean;
};

type LoadedMessages = {
  sessionID: string | null;
  messages: ThreadMessageLike[];
  model: OpenCodeModelSelection | null;
  modelError?: string;
};

type WebsiteContext = {
  title: string;
  url: string;
  markdown: string;
};

type WebsiteContextState =
  | { status: "off" }
  | { status: "loading" }
  | { status: "ready"; context: WebsiteContext }
  | { status: "error"; message: string };

function addWebsiteContext(
  prompt: string,
  context: WebsiteContext,
  labels: {
    notice: string;
    title: string;
    url: string;
    markdown: string;
  },
) {
  return [
    prompt,
    "",
    labels.notice,
    `${labels.title}: ${context.title}`,
    `${labels.url}: ${context.url}`,
    `${labels.markdown}:`,
    context.markdown,
  ].join("\n");
}

function toThreadMessages(
  messages: Awaited<ReturnType<typeof getOpenCodeSessionMessages>>,
): ThreadMessageLike[] {
  return messages.flatMap((message): ThreadMessageLike[] => {
    if (message.type === "user") {
      return [{ id: message.id, role: "user", content: message.text }];
    }
    if (message.type !== "assistant") return [];

    const text = message.content
      .flatMap((part) => (part.type === "text" ? [part.text] : []))
      .join("\n")
      .trim();

    if (!text) return [];

    const usage: OpenCodeUsage = {
      ...(message.cost !== undefined ? { cost: message.cost } : {}),
      ...(message.tokens ? { tokens: message.tokens } : {}),
    };
    const hasUsage = message.cost !== undefined || message.tokens !== undefined;

    return [
      {
        id: message.id,
        role: "assistant",
        content: text,
        ...(hasUsage
          ? { metadata: { custom: { openCodeUsage: usage } } }
          : {}),
      },
    ];
  });
}

function getFirstUserPrompt(messages: ThreadMessageLike[]) {
  const firstUserMessage = messages.find((message) => message.role === "user");
  if (!firstUserMessage) return undefined;

  const text =
    typeof firstUserMessage.content === "string"
      ? firstUserMessage.content
      : firstUserMessage.content
          .flatMap((part) => (part.type === "text" ? [part.text] : []))
          .join("");
  return text.trim() || undefined;
}

function makeSessionTitle(prompt: string, fallbackTitle: string) {
  const characters = Array.from(prompt.replace(/\s+/g, " ").trim());
  const maxLength = 36;
  return characters.length > maxLength
    ? `${characters.slice(0, maxLength).join("")}…`
    : characters.join("") || fallbackTitle;
}

export function AssistantChat({
  sessionID,
  title,
  initialPrompt,
  onSessionCreated,
  onTitleChange,
  onBusyChange,
  autoFocus = false,
}: AssistantChatProps) {
  const { t } = useTranslation();
  // The initial session restores history; later session creation must not reset this runtime.
  const [restoredSessionID] = useState(sessionID);
  const [loadedMessages, setLoadedMessages] = useState<LoadedMessages | null>(
    restoredSessionID
      ? null
      : { sessionID: null, messages: [], model: null },
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (!restoredSessionID) return;

    let active = true;
    setError("");
    setLoadedMessages(null);

    Promise.allSettled([
      getOpenCodeSessionMessages(restoredSessionID),
      getOpenCodeSessionModel(restoredSessionID),
    ])
      .then(([messagesResult, modelResult]) => {
        if (!active) return;
        if (messagesResult.status === "rejected") {
          throw messagesResult.reason;
        }

        setLoadedMessages({
          sessionID: restoredSessionID,
          messages: toThreadMessages(messagesResult.value),
          model: modelResult.status === "fulfilled" ? modelResult.value : null,
          modelError:
            modelResult.status === "rejected"
              ? modelResult.reason instanceof Error
                ? modelResult.reason.message
                : i18n.t("chat.modelError")
              : undefined,
        });
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error ? cause.message : i18n.t("chat.sessionLoadError"),
          );
        }
      });

    return () => {
      active = false;
    };
  }, [restoredSessionID]);

  if (error) {
    return (
      <p
        className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
        role="alert"
      >
        {error}
      </p>
    );
  }

  if (!loadedMessages || loadedMessages.sessionID !== restoredSessionID) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500 dark:text-neutral-400">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-r-transparent" />
        {t("chat.loading")}
      </div>
    );
  }

  return (
    <ReadyAssistantChat
      autoFocus={autoFocus}
      initialMessages={loadedMessages.messages}
      initialModel={loadedMessages.model}
      initialModelError={loadedMessages.modelError}
      initialPrompt={initialPrompt}
      onBusyChange={onBusyChange}
      onSessionCreated={onSessionCreated}
      onTitleChange={onTitleChange}
      sessionID={restoredSessionID}
      title={title}
    />
  );
}

function ReadyAssistantChat({
  sessionID,
  title,
  initialMessages,
  initialModel,
  initialModelError,
  initialPrompt,
  onSessionCreated,
  onTitleChange,
  onBusyChange,
  autoFocus,
}: AssistantChatProps & {
  initialMessages: ThreadMessageLike[];
  initialModel: OpenCodeModelSelection | null;
  initialModelError?: string;
}) {
  const { t } = useTranslation();
  const sessionIDRef = useRef(sessionID);
  const initialPromptSent = useRef(false);
  const [modelCatalog, setModelCatalog] = useState<OpenCodeModelCatalog>({
    models: [],
    providers: [],
    defaultModel: null,
  });
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [modelError, setModelError] = useState(initialModelError ?? "");
  const [modelLoadAttempt, setModelLoadAttempt] = useState(0);
  const [selectedModel, setSelectedModel] = useState<OpenCodeModelSelection>(
    initialModel ?? DEFAULT_OPENCODE_MODEL,
  );
  const selectedModelRef = useRef(selectedModel);
  const hasResolvedInitialModel = useRef(Boolean(initialModel));
  const [websiteContextState, setWebsiteContextState] =
    useState<WebsiteContextState>({ status: "off" });
  const websiteContextStateRef = useRef<WebsiteContextState>({
    status: "off",
  });
  const websiteContextLoadRef = useRef<Promise<WebsiteContext> | null>(null);
  const firstUserPrompt = getFirstUserPrompt(initialMessages);
  const shouldAutoTitle = isGenericOpenCodeSessionTitle(title);

  const updateSelectedModel = useCallback(
    (next: OpenCodeModelSelection) => {
      selectedModelRef.current = next;
      setSelectedModel(next);
    },
    [],
  );

  const updateWebsiteContextState = useCallback(
    (next: WebsiteContextState) => {
      websiteContextStateRef.current = next;
      setWebsiteContextState(next);
    },
    [],
  );

  const handleToggleWebsite = useCallback(async () => {
    const current = websiteContextStateRef.current;
    if (current.status === "loading") return;
    if (current.status === "ready") {
      websiteContextLoadRef.current = null;
      updateWebsiteContextState({ status: "off" });
      return;
    }

    updateWebsiteContextState({ status: "loading" });
    const loading = extractActivePage().then((page) => ({
      title: page.title,
      url: page.url,
      markdown: pageHtmlToMarkdown(page.html),
    }));
    websiteContextLoadRef.current = loading;

    try {
      const context = await loading;
      if (websiteContextLoadRef.current !== loading) return;
      updateWebsiteContextState({ status: "ready", context });
    } catch (cause) {
      if (websiteContextLoadRef.current !== loading) return;
      websiteContextLoadRef.current = null;
      updateWebsiteContextState({
        status: "error",
        message:
          cause instanceof Error
            ? cause.message
            : i18n.t("website.retryError"),
      });
    }
  }, [updateWebsiteContextState]);

  useEffect(() => {
    let active = true;
    setIsLoadingModels(true);

    getOpenCodeModelCatalog()
      .then((catalog) => {
        if (!active) return;
        setModelCatalog(catalog);
        setModelError("");

        if (!hasResolvedInitialModel.current) {
          const availableModels = catalog.models.filter(
            (model) => model.enabled && model.status !== "deprecated",
          );
          const preferredModel =
            availableModels.find(
              (model) =>
                model.id === DEFAULT_OPENCODE_MODEL.id &&
                model.providerID === DEFAULT_OPENCODE_MODEL.providerID,
            ) ??
            (catalog.defaultModel?.enabled &&
            catalog.defaultModel.status !== "deprecated"
              ? catalog.defaultModel
              : undefined) ??
            availableModels[0];

          if (preferredModel) {
            updateSelectedModel({
              id: preferredModel.id,
              providerID: preferredModel.providerID,
            });
          }
          hasResolvedInitialModel.current = true;
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setModelError(
            cause instanceof Error
              ? cause.message
              : i18n.t("chat.modelsLoadError"),
          );
        }
      })
      .finally(() => {
        if (active) setIsLoadingModels(false);
      });

    return () => {
      active = false;
    };
  }, [modelLoadAttempt, updateSelectedModel]);

  const chatModel = useMemo<ChatModelAdapter>(
    () => ({
      async *run({ messages, abortSignal }) {
        let userMessage: (typeof messages)[number] | undefined;
        for (let index = messages.length - 1; index >= 0; index -= 1) {
          if (messages[index].role === "user") {
            userMessage = messages[index];
            break;
          }
        }

        const prompt =
          userMessage?.content
            .flatMap((part) => (part.type === "text" ? [part.text] : []))
            .join("")
            .trim() ?? "";
        if (!prompt) {
          throw new Error(t("chat.promptRequired"));
        }
        if (abortSignal.aborted) {
          throw new DOMException("请求已取消", "AbortError");
        }

        onBusyChange?.(true);
        try {
          let websiteContext: WebsiteContext | undefined;
          const websiteState = websiteContextStateRef.current;
          if (websiteState.status === "ready") {
            websiteContext = websiteState.context;
          } else if (websiteState.status === "loading") {
            const loading = websiteContextLoadRef.current;
            if (!loading) {
              throw new Error(t("chat.websiteContextNotReady"));
            }
            websiteContext = await loading;
          } else if (websiteState.status === "error") {
            throw new Error(
              t("chat.websiteContextError", {
                message: websiteState.message,
              }),
            );
          }

          const promptWithContext = websiteContext
            ? addWebsiteContext(prompt, websiteContext, {
                notice: t("website.contextNotice"),
                title: t("website.contextTitle"),
                url: t("website.contextUrl"),
                markdown: t("website.contextMarkdown"),
              })
            : prompt;
          let currentSessionID = sessionIDRef.current;
          if (!currentSessionID) {
            const sessionTitle = shouldAutoTitle
              ? makeSessionTitle(prompt, t("session.newTitle"))
              : title;
            const session = await createOpenCodeSession(
              sessionTitle,
              selectedModelRef.current,
              abortSignal,
            );
            currentSessionID = session.id;
            sessionIDRef.current = session.id;
            onSessionCreated?.(session.id);
            if (shouldAutoTitle) onTitleChange?.(sessionTitle);
          } else if (shouldAutoTitle) {
            const sessionTitle = makeSessionTitle(
              firstUserPrompt ?? prompt,
              t("session.newTitle"),
            );
            await updateOpenCodeSessionTitle(currentSessionID, sessionTitle);
            onTitleChange?.(sessionTitle);
          }

          let responseText = "";
          for await (const update of streamOpenCodeMessage(
            currentSessionID,
            promptWithContext,
            abortSignal,
            selectedModelRef.current,
          )) {
            if (update.type === "text") {
              responseText = update.text;
              yield {
                content: [{ type: "text" as const, text: update.text }],
              };
            } else if (update.usage) {
              yield {
                metadata: {
                  custom: { openCodeUsage: update.usage },
                },
              };
            }
          }

          if (!responseText) {
            yield {
              content: [
                { type: "text" as const, text: t("chat.noResponse") },
              ],
            };
          }
        } finally {
          onBusyChange?.(false);
        }
      },
    }),
    [
      firstUserPrompt,
      onBusyChange,
      onSessionCreated,
      onTitleChange,
      shouldAutoTitle,
      title,
      t,
    ],
  );

  const runtime = useLocalRuntime(chatModel, { initialMessages });

  useEffect(() => {
    if (!initialPrompt || initialPromptSent.current) return;
    initialPromptSent.current = true;
    runtime.thread.append(initialPrompt);
  }, [initialPrompt, runtime]);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread
        autoFocus={autoFocus}
        allowAttachments={false}
        footer={
          <ModelPicker
            catalog={modelCatalog}
            error={modelError}
            isLoading={isLoadingModels}
            onModelChange={(model) => {
              const keepVariant =
                model.id === selectedModelRef.current.id &&
                model.providerID === selectedModelRef.current.providerID;
              updateSelectedModel({
                ...model,
                ...(keepVariant && selectedModelRef.current.variant
                  ? { variant: selectedModelRef.current.variant }
                  : {}),
              });
            }}
            onRetry={() => setModelLoadAttempt((attempt) => attempt + 1)}
            onToggleWebsite={handleToggleWebsite}
            onVariantChange={(variant) =>
              updateSelectedModel({
                ...selectedModelRef.current,
                ...(variant ? { variant } : { variant: undefined }),
              })
            }
            selection={selectedModel}
            websiteEnabled={websiteContextState.status === "ready"}
            websiteError={
              websiteContextState.status === "error"
                ? websiteContextState.message
                : ""
            }
            websiteLoading={websiteContextState.status === "loading"}
          />
        }
      />
    </AssistantRuntimeProvider>
  );
}
