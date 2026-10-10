import { Thread } from "@/components/assistant-ui/elements/thread.aui";
import { SessionQuestionForm } from "@/components/assistant-ui/elements/session-question-form.aui";
import {
  DEFAULT_OPENCODE_MODEL,
  activateOpenCodeSessionSkill,
  createOpenCodeSessionForm,
  createOpenCodeSession,
  getOpenCodeModelCatalog,
  getOpenCodeSessionModel,
  getOpenCodeSessionMessages,
  isGenericOpenCodeSessionTitle,
  listOpenCodeSkills,
  listOpenCodeSessionForms,
  summarizeOpenCodeUsage,
  streamOpenCodeMessage,
  toOpenCodeStreamParts,
  updateOpenCodeSessionTitle,
  type OpenCodeAssistantMessage,
  type OpenCodeModelCatalog,
  type OpenCodeModelSelection,
  type OpenCodeSkill,
  type OpenCodeFormCreatePayload,
  type OpenCodeFormField,
  type OpenCodeSessionForm,
  type OpenCodeUsage,
} from "@/lib/api/session";
import { ModelPicker } from "@/components/model-picker";
import i18n from "@/lib/i18n";
import {
  extractActivePage,
  pageHtmlToMarkdown,
  UnsupportedWebsiteProtocolError,
} from "@/lib/page-extractor";
import { toast } from "@/components/ui/toast";
import {
  WEBPAGE_CONTEXT_END,
  WEBPAGE_CONTEXT_START,
} from "@/lib/webpage-context";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ChatModelAdapter,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { GlobeIcon, XIcon } from "lucide-react";
import { animate } from "motion";

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
  icon: string;
  markdown: string;
};

type WebsiteContextState = {
  sites: WebsiteContext[];
  loading: boolean;
  error?: string;
};

function addWebsiteContexts(
  prompt: string,
  contexts: WebsiteContext[],
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
    WEBPAGE_CONTEXT_START,
    contexts
      .map((context) => formatWebsiteContext(context, labels))
      .join("\n\n---\n\n"),
    WEBPAGE_CONTEXT_END,
  ].join("\n");
}

function formatWebsiteContext(
  context: WebsiteContext,
  labels: {
    notice: string;
    title: string;
    url: string;
    markdown: string;
  },
) {
  return [
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
  const threadMessages: ThreadMessageLike[] = [];
  let assistantTurn: OpenCodeAssistantMessage[] = [];

  const appendAssistantTurn = () => {
    if (assistantTurn.length === 0) return;

    const content = assistantTurn.flatMap((message) =>
      toOpenCodeStreamParts(message).map((part) => {
        if (part.type === "text" || part.type === "reasoning") {
          return { ...part, id: `${message.id}:${part.id}` };
        }
        if (part.type === "tool-call") {
          return { ...part, toolCallId: `${message.id}:${part.toolCallId}` };
        }
        return part;
      }),
    );
    const usage = summarizeOpenCodeUsage(assistantTurn);
    const finalMessage = assistantTurn[assistantTurn.length - 1];

    if (content.length > 0 || usage) {
      threadMessages.push({
        id: assistantTurn[0].id,
        role: "assistant",
        content,
        metadata: {
          custom: {
            ...(usage ? { openCodeUsage: usage } : {}),
            openCodeModel: {
              id: finalMessage.model.id,
              providerID: finalMessage.model.providerID,
              ...(finalMessage.model.variant
                ? { variant: finalMessage.model.variant }
                : {}),
            },
          },
        },
      });
    }

    assistantTurn = [];
  };

  for (const message of messages) {
    if (message.type === "assistant") {
      assistantTurn.push(message);
    } else if (message.type === "user") {
      appendAssistantTurn();
      threadMessages.push({
        id: message.id,
        role: "user",
        content: message.text,
      });
    }
  }
  appendAssistantTurn();

  return threadMessages;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function questionToolFormPayload(
  args: unknown,
  title: string,
): OpenCodeFormCreatePayload | null {
  if (!isRecord(args) || !Array.isArray(args.questions)) return null;

  const fields: OpenCodeFormField[] = [];
  for (const [index, value] of args.questions.entries()) {
    if (!isRecord(value) || typeof value.question !== "string") return null;

    const options = Array.isArray(value.options)
      ? value.options.flatMap((option) => {
          if (!isRecord(option) || typeof option.label !== "string") return [];
          return [
            {
              value:
                typeof option.value === "string"
                  ? option.value
                  : option.label,
              label: option.label,
              ...(typeof option.description === "string"
                ? { description: option.description }
                : {}),
            },
          ];
        })
      : [];
    const header = typeof value.header === "string" ? value.header : undefined;
    const baseField = {
      key: `question-${index + 1}`,
      title: header ?? value.question,
      ...(header ? { description: value.question } : {}),
      required: true,
    };

    fields.push(
      options.length > 0
        ? value.multiple === true
          ? {
              ...baseField,
              type: "multiselect",
              options,
              minItems: 1,
            }
          : {
              ...baseField,
              type: "string",
              options,
              custom: true,
            }
        : { ...baseField, type: "string" },
    );
  }

  const [first, ...rest] = fields;
  if (!first) return null;
  return { title, fields: [first, ...rest] };
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
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent" />
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
  const [activeSessionID, setActiveSessionID] = useState(sessionID);
  const [isAssistantRunning, setIsAssistantRunning] = useState(false);
  const initialPromptSent = useRef(false);
  const [pendingForms, setPendingForms] = useState<OpenCodeSessionForm[]>([]);
  const [webpageContexts, setWebpageContexts] = useState<Record<string, string>>(
    {},
  );
  const handledQuestionCallsRef = useRef(new Set<string>());
  const [formCreationError, setFormCreationError] = useState(false);
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
  const [skills, setSkills] = useState<OpenCodeSkill[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [skillsError, setSkillsError] = useState(false);
  const skillsRef = useRef<OpenCodeSkill[]>([]);
  skillsRef.current = skills;
  const selectedModelRef = useRef(selectedModel);
  const hasResolvedInitialModel = useRef(Boolean(initialModel));
  const [websiteContextState, setWebsiteContextState] =
    useState<WebsiteContextState>({ sites: [], loading: false });
  const websiteContextStateRef = useRef<WebsiteContextState>({
    sites: [],
    loading: false,
  });
  const websiteCardRefs = useRef(new Map<string, HTMLDivElement>());
  const animatedWebsiteURLs = useRef(new Set<string>());
  const removingWebsiteURLs = useRef(new Set<string>());
  const firstUserPrompt = getFirstUserPrompt(initialMessages);
  const shouldAutoTitle = isGenericOpenCodeSessionTitle(title);

  useEffect(() => {
    let active = true;
    listOpenCodeSkills()
      .then(({ data }) => {
        if (active) {
          setSkills(data);
          setSkillsError(false);
        }
      })
      .catch(() => {
        if (active) setSkillsError(true);
      })
      .finally(() => {
        if (active) setSkillsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!activeSessionID) {
      setPendingForms([]);
      return;
    }

    let active = true;
    let isRefreshing = false;
    const refreshPendingForms = async () => {
      if (isRefreshing) return;
      isRefreshing = true;
      try {
        const forms = await listOpenCodeSessionForms(activeSessionID);
        if (active) setPendingForms(forms);
      } catch {
        // Keep forms already received from the event stream.
      } finally {
        isRefreshing = false;
      }
    };

    void refreshPendingForms();
    const interval = isAssistantRunning
      ? window.setInterval(() => void refreshPendingForms(), 1000)
      : undefined;

    return () => {
      active = false;
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, [activeSessionID, isAssistantRunning]);

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

  const handleAddWebsite = useCallback(async () => {
    const current = websiteContextStateRef.current;
    if (current.loading) return;
    updateWebsiteContextState({ ...current, loading: true, error: undefined });
    try {
      const page = await extractActivePage();
      const websiteContext = {
        title: page.title,
        url: page.url,
        icon: page.icon,
        markdown: pageHtmlToMarkdown(page.html),
      };
      const latest = websiteContextStateRef.current;
      updateWebsiteContextState({
        ...latest,
        sites: latest.sites.some((site) => site.url === page.url)
          ? latest.sites
          : [...latest.sites, websiteContext],
        loading: false,
        error: undefined,
      });
    } catch (cause) {
      const latest = websiteContextStateRef.current;
      if (cause instanceof UnsupportedWebsiteProtocolError) {
        updateWebsiteContextState({
          ...latest,
          loading: false,
          error: undefined,
        });
        toast.add({ title: cause.message, type: "error" });
        return;
      }
      updateWebsiteContextState({
        ...latest,
        loading: false,
        error:
          cause instanceof Error ? cause.message : i18n.t("website.retryError"),
      });
    }
  }, [updateWebsiteContextState]);

  const handleRemoveWebsite = useCallback(
    (url: string) => {
      if (removingWebsiteURLs.current.has(url)) return;
      removingWebsiteURLs.current.add(url);

      const removeWebsite = () => {
        const latest = websiteContextStateRef.current;
        animatedWebsiteURLs.current.delete(url);
        removingWebsiteURLs.current.delete(url);
        updateWebsiteContextState({
          ...latest,
          sites: latest.sites.filter((site) => site.url !== url),
        });
      };

      const card = websiteCardRefs.current.get(url);
      if (!card) {
        removeWebsite();
        return;
      }

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      animate(
        card,
        { opacity: 0, scale: 0.72 },
        { duration: reduceMotion ? 0 : 0.2, onComplete: removeWebsite },
      );
    },
    [updateWebsiteContextState],
  );

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

        const rawPrompt =
          userMessage?.content
            .flatMap((part) => (part.type === "text" ? [part.text] : []))
            .join("")
            .trim() ?? "";
        const skillCommand = rawPrompt.match(/^\/([^\s/]+)(?:\s+([\s\S]*))?$/);
        const requestedSkill = skillCommand
          ? skillsRef.current.find((skill) => skill.id === skillCommand[1])
          : undefined;
        const prompt = (requestedSkill ? skillCommand?.[2] ?? "" : rawPrompt).trim();
        if (!prompt && !requestedSkill) {
          throw new Error(t("chat.promptRequired"));
        }
        if (abortSignal.aborted) {
          throw new DOMException("请求已取消", "AbortError");
        }

        const websiteState = websiteContextStateRef.current;
        if (websiteState.loading) throw new Error(t("website.reading"));
        const websiteContexts = websiteState.sites;
        setIsAssistantRunning(true);
        onBusyChange?.(true);
        let websiteContextsDetached = false;
        let websiteContextSent = false;
        try {
          const webpageLabels = {
            notice: t("website.contextNotice"),
            title: t("website.contextTitle"),
            url: t("website.contextUrl"),
            markdown: t("website.contextMarkdown"),
          };
          const promptWithContext = websiteContexts.length
            ? addWebsiteContexts(prompt, websiteContexts, webpageLabels)
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
            setActiveSessionID(session.id);
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
          let responseContent: ThreadMessageLike["content"] = [];
          if (websiteContexts.length && userMessage.id) {
            setWebpageContexts((current) => ({
              ...current,
              [userMessage.id]: websiteContexts
                .map((context) => formatWebsiteContext(context, webpageLabels))
                .join("\n\n---\n\n"),
            }));
          }
          if (websiteContexts.length) {
            const latest = websiteContextStateRef.current;
            updateWebsiteContextState({
              ...latest,
              sites: latest.sites.filter(
                (site) =>
                  !websiteContexts.some((context) => context.url === site.url),
              ),
            });
            websiteContextsDetached = true;
          }
          for await (const update of streamOpenCodeMessage(
            currentSessionID,
            promptWithContext,
            abortSignal,
            selectedModelRef.current,
            () => {
              if (!websiteContexts.length) return;
              websiteContextSent = true;
            },
            requestedSkill?.id,
          )) {
            if (update.type === "content") {
              for (const part of update.content) {
                if (
                  part.type !== "tool-call" ||
                  part.toolName !== "question" ||
                  handledQuestionCallsRef.current.has(part.toolCallId)
                ) {
                  continue;
                }

                const formInput = questionToolFormPayload(
                  part.args,
                  t("form.questionTitle"),
                );
                if (!formInput) continue;

                handledQuestionCallsRef.current.add(part.toolCallId);
                try {
                  const existingForms = await listOpenCodeSessionForms(
                    currentSessionID,
                  );
                  const expectedTitles = formInput.fields.map(
                    (field) => field.title ?? field.key,
                  );
                  const existingQuestionForm = existingForms.find(
                    (form) =>
                      form.fields.length === expectedTitles.length &&
                      form.fields.every(
                        (field, index) =>
                          (field.title ?? field.key) === expectedTitles[index],
                      ),
                  );

                  if (existingQuestionForm) {
                    setPendingForms((forms) => [
                      ...forms.filter(
                        (form) => form.id !== existingQuestionForm.id,
                      ),
                      existingQuestionForm,
                    ]);
                    continue;
                  }

                  const createdForm = await createOpenCodeSessionForm(
                    currentSessionID,
                    formInput,
                  );
                  setFormCreationError(false);
                  setPendingForms((forms) => [
                    ...forms.filter((form) => form.id !== createdForm.id),
                    createdForm,
                  ]);
                } catch {
                  handledQuestionCallsRef.current.delete(part.toolCallId);
                  setFormCreationError(true);
                }
              }

              responseContent = update.content;
              responseText = update.content
                .flatMap((part) =>
                  part.type === "text" ? [part.text] : [],
                )
                .join("\n")
                .trim();
              yield { content: update.content };
            } else if (update.type === "form.created") {
              setPendingForms((forms) => [
                ...forms.filter((form) => form.id !== update.form.id),
                update.form,
              ]);
            } else if (update.type === "form.resolved") {
              setPendingForms((forms) =>
                forms.filter((form) => form.id !== update.formID),
              );
            } else if (update.type === "complete") {
              yield {
                metadata: {
                  custom: {
                    ...(update.usage
                      ? { openCodeUsage: update.usage }
                      : {}),
                    ...(update.model
                      ? { openCodeModel: update.model }
                      : {}),
                  },
                },
              };
            }
          }

          if (!responseText) {
            yield {
              content: [
                ...(Array.isArray(responseContent) ? responseContent : []),
                { type: "text" as const, text: t("chat.noResponse") },
              ],
            };
          }
        } catch (cause) {
          if (
            websiteContextsDetached &&
            !websiteContextSent &&
            websiteContexts.length
          ) {
            const latest = websiteContextStateRef.current;
            const sitesByUrl = new Map(
              [...websiteContexts, ...latest.sites].map((site) => [
                site.url,
                site,
              ]),
            );
            updateWebsiteContextState({
              ...latest,
              sites: Array.from(sitesByUrl.values()),
              error:
                cause instanceof Error
                  ? cause.message
                  : i18n.t("website.retryError"),
            });
          }
          throw cause;
        } finally {
          setIsAssistantRunning(false);
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
      updateWebsiteContextState,
      setPendingForms,
      setActiveSessionID,
      setWebpageContexts,
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
        skills={skills}
        skillsLoading={skillsLoading}
        skillsError={skillsError}
        webpageContexts={webpageContexts}
        beforeComposer={
          websiteContextState.sites.length > 0 ||
            websiteContextState.error ||
            (activeSessionID &&
              (pendingForms.length > 0 || formCreationError)) ? (
            <div className="flex flex-col gap-3">
              {websiteContextState.sites.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {websiteContextState.sites.map((site) => (
                    <div
                      key={site.url}
                      ref={(node) => {
                        if (node) {
                          websiteCardRefs.current.set(site.url, node);
                          if (!animatedWebsiteURLs.current.has(site.url)) {
                            animatedWebsiteURLs.current.add(site.url);
                            const reduceMotion = window.matchMedia(
                              "(prefers-reduced-motion: reduce)",
                            ).matches;
                            animate(
                              node,
                              { opacity: [0, 1], x: [36, 0] },
                              { duration: reduceMotion ? 0 : 0.18 },
                            );
                          }
                        } else {
                          websiteCardRefs.current.delete(site.url);
                        }
                      }}
                      style={{ opacity: 0 }}
                      className="flex h-14 min-w-0 max-w-56 shrink-0 items-center gap-2 rounded-lg border border-border bg-background px-2.5 shadow-sm"
                    >
                      <div className="relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-md bg-muted text-muted-foreground">
                        <GlobeIcon className="size-4" />
                        {site.icon ? (
                          <img
                            src={site.icon}
                            alt=""
                            className="absolute inset-0 size-full bg-background object-cover"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate text-xs font-medium text-foreground"
                          title={site.title}
                        >
                          {site.title}
                        </p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {new URL(site.url).hostname}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={`${t("website.remove")} ${site.title}`}
                        title={t("website.remove")}
                        onClick={() => handleRemoveWebsite(site.url)}
                        className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/20 dark:hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <XIcon className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              {websiteContextState.error ? (
                <p className="text-xs text-destructive" role="alert">
                  {websiteContextState.error}
                </p>
              ) : null}
              {activeSessionID && formCreationError ? (
                <p className="text-sm text-destructive" role="alert">
                  {t("form.createError")}
                </p>
              ) : null}
              {activeSessionID &&
                pendingForms.map((form) => (
                  <SessionQuestionForm
                    key={form.id}
                    form={form}
                    onResolved={(formID) =>
                      setPendingForms((forms) =>
                        forms.filter((item) => item.id !== formID),
                      )
                    }
                    sessionID={activeSessionID}
                  />
                ))}
            </div>
          ) : null
        }
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
            onAddWebsite={handleAddWebsite}
            onVariantChange={(variant) =>
              updateSelectedModel({
                ...selectedModelRef.current,
                ...(variant ? { variant } : { variant: undefined }),
              })
            }
            selection={selectedModel}
            websiteEnabled={websiteContextState.sites.length > 0}
            websiteError={websiteContextState.error ?? ""}
            websiteLoading={websiteContextState.loading}
          />
        }
      />
    </AssistantRuntimeProvider>
  );
}
