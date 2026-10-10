declare namespace chrome.sidePanel {
  interface CloseOptions {
    tabId?: number;
    windowId?: number;
  }

  interface PanelBehavior {
    openPanelOnActionClick?: boolean;
  }

  function close(options: CloseOptions): Promise<void>;
  function setPanelBehavior(behavior: PanelBehavior): Promise<void>;
}