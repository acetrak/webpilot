import TurndownService from "turndown";
import i18n from "@/lib/i18n";

export type ExtractedPage = {
  title: string;
  url: string;
  icon: string;
  html: string;
};

export class UnsupportedWebsiteProtocolError extends Error {
  constructor() {
    super(i18n.t("website.httpsRequired"));
    this.name = "UnsupportedWebsiteProtocolError";
  }
}

const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

turndownService.remove([
  "script",
  "style",
  "noscript",
  "iframe",
  "svg",
  "button",
  "form",
  "input",
  "textarea",
  "select",
]);

export function pageHtmlToMarkdown(html: string) {
  const markdown = turndownService.turndown(html).trim().slice(0, 30000);
  if (!markdown) throw new Error(i18n.t("website.emptyContent"));
  return markdown;
}

export async function extractActivePage(): Promise<ExtractedPage> {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  if (tab?.id === undefined) throw new Error(i18n.t("website.cannotReadTab"));
  if (!tab.url?.startsWith("https://")) {
    throw new UnsupportedWebsiteProtocolError();
  }

  const [injection] = await chrome.scripting.executeScript<
    [],
    Omit<ExtractedPage, "icon">
  >({
    target: { tabId: tab.id },
    func: () => ({
      title: document.title,
      url: location.href,
      html: (() => {
        const content =
          document.querySelector("article") ??
          document.querySelector("main") ??
          document.body;
        const clone = content?.cloneNode(true) as Element | undefined;
        if (!clone) return "";
        clone
          .querySelectorAll(
            "script,style,noscript,iframe,svg,button,form,input,textarea,select,[hidden],[aria-hidden='true']",
          )
          .forEach((element) => element.remove());
        return clone.innerHTML.slice(0, 100000);
      })(),
    }),
  });

  const page = injection?.result;
  if (!page?.html) throw new Error(i18n.t("website.noPageContent"));
  return { ...page, icon: tab.favIconUrl ?? "" };
}
