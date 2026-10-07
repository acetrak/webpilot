import { AssistantChat } from "@/components/assistant-chat";
import { useTranslation } from "react-i18next";

type SessionDetailProps = {
  sessionID: string;
  onBusyChange: (isBusy: boolean) => void;
};

export function SessionDetail({
  sessionID,
  onBusyChange,
}: SessionDetailProps) {
  const { t } = useTranslation();
  return (
    <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-background shadow-sm shadow-slate-900/[0.03]">
      <AssistantChat
        autoFocus
        onBusyChange={onBusyChange}
        sessionID={sessionID}
        title={t("session.historyTitle")}
      />
    </div>
  );
}
