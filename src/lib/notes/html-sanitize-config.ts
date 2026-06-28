import sanitizeHtml, { type IOptions, type Attributes } from "sanitize-html";

export const MARKDOWN_ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
  "code",
  "pre",
  "hr",
  "input",
] as const;

export const PASTE_ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "h1",
  "h2",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
  "code",
  "pre",
] as const;

export type MarkdownSanitizeOptions = {
  interactiveChecklists?: boolean;
};

function hardenLinkAttribs(attribs: Attributes): Attributes {
  const href = attribs.href;
  if (!href || href.trim().toLowerCase().startsWith("javascript:")) {
    const { href: _removed, ...rest } = attribs;
    return rest;
  }

  if (/^https?:\/\//i.test(href)) {
    return {
      ...attribs,
      target: "_blank",
      rel: "noopener noreferrer",
    };
  }

  return attribs;
}

function hardenCheckboxAttribs(
  attribs: Attributes,
  interactiveChecklists: boolean
): Attributes {
  const next = { ...attribs };
  if (interactiveChecklists) {
    delete next.disabled;
  } else {
    next.disabled = "disabled";
  }
  return next;
}

export function buildMarkdownSanitizeOptions(
  options: MarkdownSanitizeOptions = {}
): IOptions {
  const interactiveChecklists = options.interactiveChecklists ?? false;
  const inputAttrs = interactiveChecklists
    ? (["type", "checked", "data-checklist-index", "aria-label"] as const)
    : (["type", "checked", "disabled"] as const);

  return {
    allowedTags: [...MARKDOWN_ALLOWED_TAGS],
    allowedAttributes: {
      a: ["href", "title", "rel", "target"],
      input: [...inputAttrs],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesAppliedToAttributes: ["href"],
    exclusiveFilter: (frame) => frame.tag === "input" && frame.attribs.type !== "checkbox",
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: "a",
        attribs: hardenLinkAttribs(attribs),
      }),
      input: (_tagName, attribs) => ({
        tagName: "input",
        attribs: hardenCheckboxAttribs(attribs, interactiveChecklists),
      }),
    },
  };
}

export function buildPasteSanitizeOptions(): IOptions {
  return {
    allowedTags: [...PASTE_ALLOWED_TAGS],
    allowedAttributes: {
      a: ["href", "title"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesAppliedToAttributes: ["href"],
  };
}

export function sanitizeMarkdownHtmlString(
  html: string,
  options: MarkdownSanitizeOptions = {}
): string {
  return sanitizeHtml(html, buildMarkdownSanitizeOptions(options));
}

export function sanitizePasteHtmlString(html: string): string {
  return sanitizeHtml(html, buildPasteSanitizeOptions());
}
