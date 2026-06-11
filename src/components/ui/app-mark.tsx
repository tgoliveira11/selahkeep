import { cn } from "@/lib/ui/cn";

type AppMarkProps = {
  className?: string;
  size?: number;
};

/** Brand mark: sealed private letter on sage ground (matches app/icon.svg). */
export function AppMark({ className, size = 28 }: AppMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <rect width="32" height="32" rx="8" fill="#4a6741" />
      <rect x="6" y="10" width="20" height="14" rx="2" fill="#faf8f5" />
      <path d="M6 11.75 16 19.25 26 11.75" fill="#e8dcc8" />
      <path
        d="M6 11.75 16 19.25 26 11.75"
        stroke="#4a6741"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <rect
        x="6"
        y="10"
        width="20"
        height="14"
        rx="2"
        stroke="#4a6741"
        strokeWidth="1.25"
      />
      <circle cx="16" cy="20" r="2.75" fill="#c4a574" />
    </svg>
  );
}
