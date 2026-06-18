import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconBold(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 4h8a4 4 0 0 1 0 8H6z" />
      <path d="M6 12h9a4 4 0 0 1 0 8H6z" />
    </IconBase>
  );
}

export function IconItalic(props: IconProps) {
  return (
    <IconBase {...props}>
      <line x1="19" y1="4" x2="10" y2="4" />
      <line x1="14" y1="20" x2="5" y2="20" />
      <line x1="15" y1="4" x2="9" y2="20" />
    </IconBase>
  );
}

export function IconH1(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 12h8" />
      <path d="M4 6v12" />
      <path d="M12 6v12" />
      <path d="M17 6v12" />
      <path d="M14 6h6" />
    </IconBase>
  );
}

export function IconH2(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 12h8" />
      <path d="M4 6v12" />
      <path d="M12 6v12" />
      <path d="M21 12c0 2-1.5 3-3.5 3S14 14 14 12s1.5-3 3.5-3S21 10 21 12z" />
    </IconBase>
  );
}

export function IconQuote(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 10h4v7H3z" />
      <path d="M11 10h4v7h-4z" />
    </IconBase>
  );
}

export function IconList(props: IconProps) {
  return (
    <IconBase {...props}>
      <line x1="9" y1="6" x2="20" y2="6" />
      <line x1="9" y1="12" x2="20" y2="12" />
      <line x1="9" y1="18" x2="20" y2="18" />
      <circle cx="5" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="5" cy="18" r="1" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function IconChecklist(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="5" width="4" height="4" rx="0.5" />
      <rect x="3" y="13" width="4" height="4" rx="0.5" />
      <path d="M9 7h12" />
      <path d="M9 15h12" />
    </IconBase>
  );
}

export function IconLink(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11 4.93" />
      <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 1 0 7.07 7.07L13 19.07" />
    </IconBase>
  );
}

export function IconCode(props: IconProps) {
  return (
    <IconBase {...props}>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </IconBase>
  );
}

export function IconMarkdown(props: IconProps) {
  return (
    <IconBase {...props}>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
      <line x1="12" y1="4" x2="12" y2="20" strokeDasharray="2 2" />
    </IconBase>
  );
}
