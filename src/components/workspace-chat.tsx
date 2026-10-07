import { AssistantChat } from "@/components/assistant-chat";
import {
  useSessionWorkspaceStore,
  type WorkspaceChat as WorkspaceChatData,
} from "@/lib/stores/session-workspace";
import { memo, useCallback } from "react";

export const WorkspaceChat = memo(function WorkspaceChat({
  chat,
  onTitleChange,
}: {
  chat: WorkspaceChatData;
  onTitleChange?: () => void;
}) {
  const isActive = useSessionWorkspaceStore(
    (state) => state.activeChatID === chat.id,
  );
  const bindSessionID = useSessionWorkspaceStore((state) => state.bindSessionID);
  const setBusy = useSessionWorkspaceStore((state) => state.setBusy);
  const setChatTitle = useSessionWorkspaceStore((state) => state.setChatTitle);

  const handleSessionCreated = useCallback(
    (sessionID: string) => bindSessionID(chat.id, sessionID),
    [bindSessionID, chat.id],
  );
  const handleBusyChange = useCallback(
    (busy: boolean) => setBusy(chat.id, busy),
    [chat.id, setBusy],
  );
  const handleTitleChange = useCallback(
    (title: string) => {
      setChatTitle(chat.id, title);
      onTitleChange?.();
    },
    [chat.id, onTitleChange, setChatTitle],
  );

  return (
    <div hidden={!isActive} className="h-full min-h-0">
      <AssistantChat
        autoFocus={isActive}
        initialPrompt={chat.initialPrompt}
        onBusyChange={handleBusyChange}
        onSessionCreated={handleSessionCreated}
        onTitleChange={handleTitleChange}
        sessionID={chat.sessionID}
        title={chat.title}
      />
    </div>
  );
});
