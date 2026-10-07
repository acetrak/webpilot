import DOMPurify from "dompurify";
import MarkdownIt from "markdown-it";
import { memo, useMemo } from "react";
import type { TextMessagePartProps } from "@assistant-ui/react";
import { cn } from "@/lib/utils";

type MarkdownTextProps = Pick<TextMessagePartProps, "text"> & {
  className?: string;
};

const markdown = new MarkdownIt({
  breaks: true,
  html: false,
  linkify: true,
});

markdown.disable("image");
markdown.renderer.rules.link_open = (tokens, index, options, _env, renderer) => {
  const token = tokens[index];
  const rawHref = token.attrGet("href");
  const href = typeof rawHref === "string" ? rawHref : "";
  const safeLink =
    /^(https?:\/\/|mailto:|tel:|#)/i.test(href) ||
    (href.startsWith("/") && !href.startsWith("//"));

  if (!safeLink) {
    token.attrSet("href", "#");
  } else if (/^https?:\/\//i.test(href)) {
    token.attrSet("target", "_blank");
    token.attrSet("rel", "noopener noreferrer");
  }
  return renderer.renderToken(tokens, index, options);
};

const MarkdownTextImpl = ({ text, className }: MarkdownTextProps) => {
  const html = useMemo(() => {
    const rendered = markdown.render(text);
    return DOMPurify.sanitize(rendered, {
      FORBID_ATTR: ["style"],
      FORBID_TAGS: ["img", "style"],
      USE_PROFILES: { html: true },
    });
  }, [text]);

  return (
    <div
      className={cn("aui-md min-w-0 break-words", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export const MarkdownText = memo(MarkdownTextImpl);
