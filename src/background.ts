chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error: unknown) => {
    console.error(
      "Failed to enable side panel on extension icon click:",
      error,
    );
  });
