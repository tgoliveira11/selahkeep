import { cn } from "../lib/cn";
import { BRAND_MARK_SVG } from "../lib/brand-mark";

type AppMarkProps = {
  className?: string;
  size?: number;
};

/** Brand mark: purple LTG monogram (matches src/app/icon.svg). */
export function AppMark({ className, size = 28 }: AppMarkProps) {
  const svg = BRAND_MARK_SVG.replace(
    'viewBox="0 0 32 32"',
    `viewBox="0 0 32 32" width="${size}" height="${size}"`
  );

  return (
    <span
      className={cn("inline-flex shrink-0 leading-none", className)}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
