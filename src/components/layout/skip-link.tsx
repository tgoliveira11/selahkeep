import { MAIN_CONTENT_ID } from "@/lib/ui/main-content";

export function SkipLink() {
  return (
    <a href={`#${MAIN_CONTENT_ID}`} className="skip-link">
      Skip to content
    </a>
  );
}
