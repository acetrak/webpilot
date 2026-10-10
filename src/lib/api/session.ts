import { client } from "@/lib/client";
import { defer, finalize, from, Observable, share } from "rxjs";

type OpenCodeJsonValue =
  | string
  | number
  | boolean
  | null
  | OpenCodeJsonValue[]
  | { readonly [key: string]: OpenCodeJsonValue };
type OpenCodeJsonObject = { readonly [key: string]: OpenCodeJsonValue };

export type OpenCodeModel = Awaited<
  ReturnType<typeof client.model.list>
>["data"][number];

export type OpenCodeProvider = Awaited<
  ReturnType<typeof client.provider.list>
>["data"][number];

export type OpenCodeSkill = Awaited<
  ReturnType<typeof client.skill.list>
>["data"][number];

export type OpenCodeModelSelection = {
  providerID: string;
  id: string;
  variant?: string;
};

export type OpenCodeModelCatalog = {
  models: OpenCodeModel[];
  providers: OpenCodeProvider[];
  defaultModel: OpenCodeModel | null;
};

export const DEFAULT_OPENCODE_MODEL: OpenCodeModelSelection = {
  providerID: "github-copilot",
  id: "gpt-6-luna",
};

const PLUGIN_SESSION_METADATA_KEY = "opencodeWebExtension";
const PLUGIN_SESSION_TITLE_PREFIX = "【插件会话】";

type OpenCodeEvent = ReturnType<typeof client.event.subscribe> extends AsyncIterable<
  infer Event
>
  ? Event
  : never;

type OpenCodeStreamPart =
  | {
      type: "text";
      id: string;
      text: string;
      status: { type: "running" | "complete" };
    }
  | {
      type: "reasoning";
      id: string;
      text: string;
      status: { type: "running" | "complete" };
    }
  | {
      type: "tool-call";
      toolCallId: string;
      toolName: string;
      args: OpenCodeJsonObject;
      argsText: string;
      result?: unknown;
      isError?: boolean;
    };

export type OpenCodeStreamUpdate =
  | { type: "content"; content: OpenCodeStreamPart[] }
  | { type: "form.created"; form: OpenCodeSessionForm }
  | { type: "form.resolved"; formID: string }
  | {
      type: "complete";
      usage?: OpenCodeUsage;
      model?: OpenCodeModelReference;
    };

const openCodeEvents$ = defer(() => {
  const controller = new AbortController();
  return from(client.event.subscribe({ signal: controller.signal })).pipe(
    finalize(() => controller.abort()),
  );
}).pipe(share());

export const checkOpenCodeConnection = () => {
  return client.server.info();
};

export const verifyOpenCodeCredentials = () => {
  return client.model.list();
};

export type OpenCodeSessionForm = Awaited<
  ReturnType<typeof client.session.form.list>
>[number];
export type OpenCodeFormField = OpenCodeSessionForm["fields"][number];
export type OpenCodeFormAnswer = Parameters<
  typeof client.session.form.reply
>[0]["answer"];
export type OpenCodeFormCreatePayload = Omit<
  Parameters<typeof client.session.form.create>[0],
  "sessionID"
>;

export function listOpenCodeSessionForms(sessionID: string) {
  return client.session.form.list({ sessionID });
}

export function replyOpenCodeSessionForm(
  sessionID: string,
  formID: string,
  answer: OpenCodeFormAnswer,
) {
  return client.session.form.reply({ sessionID, formID, answer });
}

export function createOpenCodeSessionForm(
  sessionID: string,
  input: OpenCodeFormCreatePayload,
) {
  return client.session.form.create({ sessionID, ...input });
}

export function cancelOpenCodeSessionForm(
  sessionID: string,
  formID: string,
) {
  return client.session.form.cancel({ sessionID, formID });
}

export async function listOpenCodeSessions() {
  const sessions = [];
  let cursor: string | undefined;

  do {
    const page = await client.session.list({
      limit: 100,
      order: "desc",
      ...(cursor ? { cursor } : {}),
    });
    sessions.push(
      ...page.data.filter(
        (session) => session.metadata?.[PLUGIN_SESSION_METADATA_KEY] === true,
      ),
    );
    cursor = page.cursor.next ?? undefined;
  } while (cursor);

  return sessions;
}

export type OpenCodeSession = Awaited<
  ReturnType<typeof listOpenCodeSessions>
>[number];

export function deleteOpenCodeSession(sessionID: string) {
  return client.session.remove({ sessionID });
}

export function getOpenCodeSessionDisplayTitle(title: string) {
  const displayTitle = title.startsWith(PLUGIN_SESSION_TITLE_PREFIX)
    ? title.slice(PLUGIN_SESSION_TITLE_PREFIX.length)
    : title;
  return displayTitle.trim();
}

export function getGenericOpenCodeSessionTitleKind(
  title: string,
): "new" | "untitled" | undefined {
  const displayTitle = getOpenCodeSessionDisplayTitle(title).toLowerCase();
  if (
    [
      "新会话",
      "新建会话",
      "新對話",
      "新會話",
      "新增對話",
      "new conversation",
      "new session",
      "new chat",
      "新しい会話",
      "新しいチャット",
      "새 대화",
      "nouvelle conversation",
      "nouvelle session",
      "nouvelle discussion",
      "nueva conversación",
      "nueva sesión",
      "nuevo chat",
    ].includes(displayTitle)
  ) {
    return "new";
  }
  if (
    !displayTitle ||
    [
      "未命名会话",
      "未命名對話",
      "untitled conversation",
      "untitled session",
      "無題の会話",
      "無題のセッション",
      "제목 없는 대화",
      "제목 없는 세션",
      "conversation sans titre",
      "session sans titre",
      "conversación sin título",
      "sesión sin título",
    ].includes(displayTitle)
  ) {
    return "untitled";
  }
  return undefined;
}

export function isGenericOpenCodeSessionTitle(title: string) {
  return getGenericOpenCodeSessionTitleKind(title) !== undefined;
}

export function updateOpenCodeSessionTitle(sessionID: string, title: string) {
  return client.session.update({
    sessionID,
    title: `${PLUGIN_SESSION_TITLE_PREFIX}${title}`,
  });
}

export function interruptOpenCodeSession(sessionID: string) {
  return client.session.interrupt({ sessionID });
}

export function getOpenCodeSessionMessages(sessionID: string) {
  return client.session.context({ sessionID });
}

export type OpenCodeAssistantMessage = Extract<
  Awaited<ReturnType<typeof getOpenCodeSessionMessages>>[number],
  { type: "assistant" }
>;

export type OpenCodeUsage = Pick<
  OpenCodeAssistantMessage,
  "cost" | "tokens"
>;
export type OpenCodeModelReference = Pick<
  OpenCodeAssistantMessage["model"],
  "id" | "providerID" | "variant"
>;

export function toOpenCodeStreamParts(
  message: OpenCodeAssistantMessage,
): OpenCodeStreamPart[] {
  return message.content.flatMap((part, index): OpenCodeStreamPart[] => {
    if (part.type === "text") {
      return [
        {
          type: "text",
          id: `text-${index}`,
          text: part.text,
          status: { type: "complete" },
        },
      ];
    }
    if (part.type === "reasoning") {
      if (!part.text.trim()) return [];
      return [
        {
          type: "reasoning",
          id: `reasoning-${index}`,
          text: part.text,
          status: { type: "complete" },
        },
      ];
    }

    const state = part.state;
    const argsText =
      state.status === "streaming"
        ? state.input
        : JSON.stringify(state.input);
    let args: OpenCodeJsonObject = {};
    if (state.status !== "streaming") {
      try {
        args = JSON.parse(argsText) as OpenCodeJsonObject;
      } catch {
        args = {};
      }
    }

    return [
      {
        type: "tool-call",
        toolCallId: part.id,
        toolName: part.name,
        args,
        argsText,
        ...(state.status === "completed"
          ? {
              result: state.content
                .map((content) =>
                  content.type === "text"
                    ? content.text
                    : { uri: content.uri, mime: content.mime, name: content.name },
                )
                .join("\\n"),
            }
          : {}),
        ...(state.status === "error"
          ? { result: state.error.message, isError: true }
          : {}),
      },
    ];
  });
}

export async function getOpenCodeModelCatalog(): Promise<OpenCodeModelCatalog> {
  const [models, providers, defaultModel] = await Promise.all([
    client.model.list(),
    client.provider.list(),
    client.model.default(),
  ]);

  return {
    models: models.data,
    providers: providers.data,
    defaultModel: defaultModel.data,
  };
}

export function listOpenCodeSkills() {
  return client.skill.list();
}

export function activateOpenCodeSessionSkill(
  sessionID: string,
  id: string,
  resume = false,
  signal?: AbortSignal,
) {
  return client.session.skill(
    { sessionID, id, resume },
    signal ? { signal } : undefined,
  );
}

export async function getOpenCodeSessionModel(
  sessionID: string,
): Promise<OpenCodeModelSelection | null> {
  const session = await client.session.get({ sessionID });
  return session.model ?? null;
}

export function createOpenCodeSession(
  title: string,
  model: OpenCodeModelSelection = DEFAULT_OPENCODE_MODEL,
  signal?: AbortSignal,
) {
  return client.session.create({
    title: `${PLUGIN_SESSION_TITLE_PREFIX}${title}`,
    model,
    metadata: { [PLUGIN_SESSION_METADATA_KEY]: true },
  }, { signal });
}

export function summarizeOpenCodeUsage(
  messages: OpenCodeAssistantMessage[],
): OpenCodeUsage | undefined {
  let cost: number | undefined;
  let tokens: NonNullable<OpenCodeUsage["tokens"]> | undefined;

  for (const message of messages) {
    if (message.cost !== undefined) cost = (cost ?? 0) + message.cost;
    if (!message.tokens) continue;

    tokens = {
      input: (tokens?.input ?? 0) + message.tokens.input,
      output: (tokens?.output ?? 0) + message.tokens.output,
      reasoning: (tokens?.reasoning ?? 0) + message.tokens.reasoning,
      cache: {
        read: (tokens?.cache.read ?? 0) + message.tokens.cache.read,
        write: (tokens?.cache.write ?? 0) + message.tokens.cache.write,
      },
    };
  }

  if (cost === undefined && tokens === undefined) return undefined;
  return {
    ...(cost !== undefined ? { cost } : {}),
    ...(tokens ? { tokens } : {}),
  };
}

async function getLatestTurnResponse(sessionID: string) {
  const messages = await getOpenCodeSessionMessages(sessionID);
  let lastUserMessageIndex = -1;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].type === "user") {
      lastUserMessageIndex = index;
      break;
    }
  }

  const assistantMessages = messages
    .slice(lastUserMessageIndex + 1)
    .filter(
      (message): message is OpenCodeAssistantMessage =>
        message.type === "assistant",
    );
  const usage = summarizeOpenCodeUsage(assistantMessages);
  const model = assistantMessages.at(-1)?.model;

  return {
    content: assistantMessages.flatMap(toOpenCodeStreamParts),
    ...(usage ? { usage } : {}),
    ...(model ? { model } : {}),
  };
}

function createOpenCodeMessageUpdates(
  sessionID: string,
  prompt: string,
  signal: AbortSignal,
  model: OpenCodeModelSelection = DEFAULT_OPENCODE_MODEL,
  onPromptSent?: () => void,
  skillID?: string,
): Observable<OpenCodeStreamUpdate> {
  return new Observable((subscriber) => {
    if (signal.aborted) {
      subscriber.error(new DOMException("请求已取消", "AbortError"));
      return;
    }

    const controller = new AbortController();
    const abortRequest = () => controller.abort();
    signal.addEventListener("abort", abortRequest, { once: true });

    let promptStarted = false;
    let resolveSessionIdle: (() => void) | undefined;
    const sessionIdle = new Promise<void>((resolve) => {
      resolveSessionIdle = resolve;
    });
    const streamParts: OpenCodeStreamPart[] = [];
    const emitParts = () =>
      subscriber.next({
        type: "content" as const,
        content: streamParts.map((part) => ({ ...part })),
      });
    const parseArgs = (argsText: string): OpenCodeJsonObject => {
      try {
        const parsed: unknown = JSON.parse(argsText);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? (parsed as OpenCodeJsonObject)
          : {};
      } catch {
        return {};
      }
    };
    const upsertTool = (
      toolCallId: string,
      toolName: string,
      update: Partial<Extract<OpenCodeStreamPart, { type: "tool-call" }>>,
    ) => {
      const currentIndex = streamParts.findIndex(
        (part) => part.type === "tool-call" && part.toolCallId === toolCallId,
      );
      const current = currentIndex >= 0 ? streamParts[currentIndex] : undefined;
      const next: OpenCodeStreamPart = {
        type: "tool-call",
        toolCallId,
        toolName,
        args: current?.type === "tool-call" ? current.args : {},
        argsText: current?.type === "tool-call" ? current.argsText : "",
        ...update,
      };
      if (currentIndex >= 0) streamParts[currentIndex] = next;
      else streamParts.push(next);
    };
    const eventSubscription = openCodeEvents$.subscribe({
      next: (event) => {
        if (
          event.type === "session.idle" &&
          event.data.sessionID === sessionID
        ) {
          if (promptStarted) resolveSessionIdle?.();
          return;
        }
        if (
          event.type === "form.created" &&
          event.data.form.sessionID === sessionID
        ) {
          subscriber.next({ type: "form.created", form: event.data.form });
          return;
        }
        if (
          (event.type === "form.replied" || event.type === "form.cancelled") &&
          event.data.sessionID === sessionID
        ) {
          subscriber.next({
            type: "form.resolved",
            formID: event.data.id,
          });
          return;
        }
        if (event.type === "session.text.delta" && event.data.sessionID === sessionID) {
          const id = `text-${event.data.ordinal}`;
          const current = streamParts.find(
            (part) => part.type === "text" && part.id === id,
          );
          const text = current?.type === "text" ? current.text : "";
          const next: OpenCodeStreamPart = {
            type: "text",
            id,
            text: text + event.data.delta,
            status: { type: "running" },
          };
          const currentIndex = streamParts.findIndex(
            (part) => part.type === "text" && part.id === id,
          );
          if (currentIndex >= 0) streamParts[currentIndex] = next;
          else streamParts.push(next);
          emitParts();
          return;
        }

        if (
          event.type === "session.reasoning.delta" &&
          event.data.sessionID === sessionID
        ) {
          const id = `reasoning-${event.data.ordinal}`;
          const current = streamParts.find(
            (part) => part.type === "reasoning" && part.id === id,
          );
          const next: OpenCodeStreamPart = {
            type: "reasoning",
            id,
            text:
              (current?.type === "reasoning" ? current.text : "") +
              event.data.delta,
            status: { type: "running" },
          };
          const currentIndex = streamParts.findIndex(
            (part) => part.type === "reasoning" && part.id === id,
          );
          if (currentIndex >= 0) streamParts[currentIndex] = next;
          else streamParts.push(next);
          emitParts();
          return;
        }

        if (
          event.type === "session.tool.input.started" &&
          event.data.sessionID === sessionID
        ) {
          upsertTool(event.data.id, event.data.name, {});
          emitParts();
          return;
        }

        if (
          event.type === "session.tool.input.delta" &&
          event.data.sessionID === sessionID
        ) {
          const current = streamParts.find(
            (part) =>
              part.type === "tool-call" && part.toolCallId === event.data.id,
          );
          const argsText =
            (current?.type === "tool-call" ? current.argsText : "") +
            event.data.delta;
          upsertTool(
            event.data.id,
            current?.type === "tool-call" ? current.toolName : "tool",
            { argsText, args: parseArgs(argsText) },
          );
          emitParts();
          return;
        }

        if (
          event.type === "session.tool.input.ended" &&
          event.data.sessionID === sessionID
        ) {
          const current = streamParts.find(
            (part) =>
              part.type === "tool-call" && part.toolCallId === event.data.id,
          );
          upsertTool(
            event.data.id,
            current?.type === "tool-call" ? current.toolName : "tool",
            {
              argsText: event.data.text,
              args: parseArgs(event.data.text),
            },
          );
          emitParts();
          return;
        }

        if (
          event.type === "session.tool.called" &&
          event.data.sessionID === sessionID
        ) {
          const current = streamParts.find(
            (part) =>
              part.type === "tool-call" && part.toolCallId === event.data.id,
          );
          const argsText = JSON.stringify(event.data.input);
          upsertTool(
            event.data.id,
            current?.type === "tool-call" ? current.toolName : "tool",
            { argsText, args: event.data.input },
          );
          emitParts();
          return;
        }

        if (
          event.type === "session.tool.success" &&
          event.data.sessionID === sessionID
        ) {
          const current = streamParts.find(
            (part) =>
              part.type === "tool-call" && part.toolCallId === event.data.id,
          );
          upsertTool(
            event.data.id,
            current?.type === "tool-call" ? current.toolName : "tool",
            {
              result: event.data.content.map((item) =>
                item.type === "text"
                  ? item.text
                  : { uri: item.uri, mime: item.mime, name: item.name },
              ),
            },
          );
          emitParts();
          return;
        }

        if (
          event.type === "session.tool.failed" &&
          event.data.sessionID === sessionID
        ) {
          const current = streamParts.find(
            (part) =>
              part.type === "tool-call" && part.toolCallId === event.data.id,
          );
          upsertTool(
            event.data.id,
            current?.type === "tool-call" ? current.toolName : "tool",
            { result: event.data.error.message, isError: true },
          );
          emitParts();
        }
      },
        error: (cause: unknown) => {
          controller.abort();
          subscriber.error(cause);
        },
      });

    void (async () => {
      try {
        await client.session.switchModel({ sessionID, model }, {
          signal: controller.signal,
        });
        if (skillID) {
          await activateOpenCodeSessionSkill(
            sessionID,
            skillID,
            !prompt.trim(),
            controller.signal,
          );
        }
        if (prompt.trim()) {
          promptStarted = true;
          await client.session.prompt(
            { sessionID, text: prompt },
            { signal: controller.signal },
          );
        }
        onPromptSent?.();
        await Promise.race([
          client.session.wait(
            { sessionID },
            { signal: controller.signal },
          ),
          sessionIdle,
        ]);

        if (controller.signal.aborted) return;

        const result = await getLatestTurnResponse(sessionID);
        if (result.content.length > 0) {
          subscriber.next({ type: "content", content: result.content });
        }
        subscriber.next({
          type: "complete",
          ...(result.usage ? { usage: result.usage } : {}),
          ...(result.model ? { model: result.model } : {}),
        });
        subscriber.complete();
      } catch (cause) {
        if (controller.signal.aborted) {
          try {
            await interruptOpenCodeSession(sessionID);
          } catch (interruptCause) {
            if (!subscriber.closed) subscriber.error(interruptCause);
            return;
          }
        }
        if (!subscriber.closed) subscriber.error(cause);
      } finally {
        eventSubscription.unsubscribe();
        signal.removeEventListener("abort", abortRequest);
      }
    })();

    return () => {
      eventSubscription.unsubscribe();
      controller.abort();
      signal.removeEventListener("abort", abortRequest);
    };
  });
}

async function* observableToAsyncGenerator<T extends object>(
  source: Observable<T>,
): AsyncGenerator<T, void> {
  const queue: T[] = [];
  let complete = false;
  let hasError = false;
  let error: unknown;
  let wake: (() => void) | undefined;

  const notify = () => {
    const resolve = wake;
    wake = undefined;
    resolve?.();
  };

  const subscription = source.subscribe({
    next: (value) => {
      queue.push(value);
      notify();
    },
    error: (cause: unknown) => {
      hasError = true;
      error = cause;
      complete = true;
      notify();
    },
    complete: () => {
      complete = true;
      notify();
    },
  });

  try {
    while (true) {
      const value = queue.shift();
      if (value !== undefined) {
        yield value;
        continue;
      }
      if (complete) {
        if (hasError) throw error;
        return;
      }
      await new Promise<void>((resolve) => {
        wake = resolve;
      });
    }
  } finally {
    subscription.unsubscribe();
  }
}

export async function* streamOpenCodeMessage(
  sessionID: string,
  prompt: string,
  signal: AbortSignal,
  model: OpenCodeModelSelection = DEFAULT_OPENCODE_MODEL,
  onPromptSent?: () => void,
  skillID?: string,
): AsyncGenerator<OpenCodeStreamUpdate, void> {
  yield* observableToAsyncGenerator(
    createOpenCodeMessageUpdates(
      sessionID,
      prompt,
      signal,
      model,
      onPromptSent,
      skillID,
    ),
  );
}
