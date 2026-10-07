import {
  getOpenCodeSessionDisplayTitle,
  type OpenCodeSession,
} from "@/lib/api/session";
import { create } from "zustand";

export type WorkspaceChat = {
  id: string;
  sessionID: string | null;
  title: string;
  initialPrompt?: string;
};

type SessionWorkspaceState = {
  chats: WorkspaceChat[];
  activeChatID: string;
  busyByChatID: Record<string, boolean>;
  createChat: (title?: string, initialPrompt?: string) => string;
  openSession: (session: OpenCodeSession) => void;
  bindSessionID: (chatID: string, sessionID: string) => void;
  removeSession: (sessionID: string) => void;
  selectChat: (chatID: string) => void;
  setBusy: (chatID: string, busy: boolean) => void;
  setChatTitle: (chatID: string, title: string) => void;
};

let nextChatID = 0;

function makeChatID() {
  nextChatID += 1;
  return `local-chat-${Date.now()}-${nextChatID}`;
}

function makeNewChat(title = "新会话", initialPrompt?: string): WorkspaceChat {
  return {
    id: makeChatID(),
    sessionID: null,
    title,
    ...(initialPrompt ? { initialPrompt } : {}),
  };
}

const initialChat = makeNewChat();

export const useSessionWorkspaceStore = create<SessionWorkspaceState>(
  (set, get) => ({
    chats: [initialChat],
    activeChatID: initialChat.id,
    busyByChatID: {},

    createChat: (title, initialPrompt) => {
      const chat = makeNewChat(title, initialPrompt);
      set((state) => ({
        chats: [...state.chats, chat],
        activeChatID: chat.id,
      }));
      return chat.id;
    },

    openSession: (session) => {
      const existing = get().chats.find(
        (chat) => chat.sessionID === session.id,
      );
      if (existing) {
        set({ activeChatID: existing.id });
        return;
      }

      const chat: WorkspaceChat = {
        id: `opencode-session-${session.id}`,
        sessionID: session.id,
        title: getOpenCodeSessionDisplayTitle(session.title),
      };
      set((state) => ({
        chats: [...state.chats, chat],
        activeChatID: chat.id,
      }));
    },

    bindSessionID: (chatID, sessionID) => {
      set((state) => ({
        chats: state.chats.map((chat) =>
          chat.id === chatID ? { ...chat, sessionID } : chat,
        ),
      }));
    },

    removeSession: (sessionID) => {
      set((state) => {
        const removedChatIDs = new Set(
          state.chats
            .filter((chat) => chat.sessionID === sessionID)
            .map((chat) => chat.id),
        );
        if (removedChatIDs.size === 0) return state;

        const chats = state.chats.filter((chat) => !removedChatIDs.has(chat.id));
        const busyByChatID = Object.fromEntries(
          Object.entries(state.busyByChatID).filter(
            ([chatID]) => !removedChatIDs.has(chatID),
          ),
        );

        if (chats.length === 0) {
          const fallback = makeNewChat();
          chats.push(fallback);
          return {
            chats,
            busyByChatID,
            activeChatID: fallback.id,
          };
        }

        return {
          chats,
          busyByChatID,
          activeChatID: removedChatIDs.has(state.activeChatID)
            ? chats[0].id
            : state.activeChatID,
        };
      });
    },

    selectChat: (chatID) => set({ activeChatID: chatID }),

    setBusy: (chatID, busy) => {
      set((state) => ({
        busyByChatID: { ...state.busyByChatID, [chatID]: busy },
      }));
    },

    setChatTitle: (chatID, title) => {
      set((state) => ({
        chats: state.chats.map((chat) =>
          chat.id === chatID ? { ...chat, title } : chat,
        ),
      }));
    },
  }),
);
