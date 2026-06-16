import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PublicCtaButtonsProps {
  className?: string;
}

/** Shared primary CTAs for public/marketing pages. */
export function PublicCtaButtons({ className }: PublicCtaButtonsProps) {
  return (
    <div className={className ?? "flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center"}>
      <Link href="/register" className="sm:min-w-[160px]">
        <Button className="w-full">Create account</Button>
      </Link>
      <Link href="/login" className="sm:min-w-[160px]">
        <Button variant="secondary" className="w-full">
          Sign in
        </Button>
      </Link>
    </div>
  );
}
