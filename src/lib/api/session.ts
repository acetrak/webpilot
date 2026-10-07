import { client } from "@/lib/client";
import { defer, filter, finalize, from, Observable, share } from "rxjs";

export type OpenCodeModel = Awaited<
  ReturnType<typeof client.model.list>
>["data"][number];

export type OpenCodeProvider = Awaited<
  ReturnType<typeof client.provider.list>
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

type SessionTextDeltaEvent = Extract<
  OpenCodeEvent,
  { type: "session.text.delta" }
>;

export type OpenCodeStreamUpdate =
  | { type: "text"; text: string }
  | { type: "complete"; usage?: OpenCodeUsage };

const openCodeEvents$ = defer(() => {
  const controller = new AbortController();
  return from(client.event.subscribe({ signal: controller.signal })).pipe(
    finalize(() => controller.abort()),
  );
}).pipe(share());

export const checkOpenCodeConnection = () => {
  return client.server.info();
};

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

function summarizeOpenCodeUsage(
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
  const text = assistantMessages
    .flatMap((message) =>
      message.content.flatMap((part) =>
        part.type === "text" ? [part.text] : [],
      ),
    )
    .join("\n")
    .trim();
  const usage = summarizeOpenCodeUsage(assistantMessages);

  return { text, ...(usage ? { usage } : {}) };
}

function createOpenCodeMessageUpdates(
  sessionID: string,
  prompt: string,
  signal: AbortSignal,
  model: OpenCodeModelSelection = DEFAULT_OPENCODE_MODEL,
): Observable<OpenCodeStreamUpdate> {
  return new Observable((subscriber) => {
    if (signal.aborted) {
      subscriber.error(new DOMException("请求已取消", "AbortError"));
      return;
    }

    const controller = new AbortController();
    const abortRequest = () => controller.abort();
    signal.addEventListener("abort", abortRequest, { once: true });

    let streamedText = "";
    const textSubscription = openCodeEvents$
      .pipe(
        filter(
          (event): event is SessionTextDeltaEvent =>
            event.type === "session.text.delta" &&
            event.data.sessionID === sessionID,
        ),
      )
      .subscribe({
        next: (event) => {
          streamedText += event.data.delta;
          subscriber.next({ type: "text", text: streamedText });
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
        await client.session.prompt(
          { sessionID, text: prompt },
          { signal: controller.signal },
        );
        await client.session.wait(
          { sessionID },
          { signal: controller.signal },
        );

        if (controller.signal.aborted) return;

        const result = await getLatestTurnResponse(sessionID);
        if (result.text && result.text !== streamedText) {
          subscriber.next({ type: "text", text: result.text });
        }
        subscriber.next({
          type: "complete",
          ...(result.usage ? { usage: result.usage } : {}),
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
        textSubscription.unsubscribe();
        signal.removeEventListener("abort", abortRequest);
      }
    })();

    return () => {
      textSubscription.unsubscribe();
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
): AsyncGenerator<OpenCodeStreamUpdate, void> {
  yield* observableToAsyncGenerator(
    createOpenCodeMessageUpdates(sessionID, prompt, signal, model),
  );
}
