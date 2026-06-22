/**
 * Loading placeholder for the notes list (Stillness mockup): a grid of
 * shimmering skeleton cards while the encrypted index decrypts. Purely
 * decorative — announced as busy by the surrounding region.
 */
export function NotesSkeletonGrid() {
  return (
    <div
      className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3"
      data-testid="notes-skeleton-grid"
      role="status"
      aria-busy="true"
      aria-label="Loading your notes"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="rounded-[11px] border border-[var(--border)] bg-[var(--card)] p-[18px]"
          aria-hidden="true"
        >
          <div
            className="mb-3 h-[18px] w-[72px] rounded-md"
            style={{
              background: "linear-gradient(90deg,var(--skel),var(--bg-2),var(--skel))",
              backgroundSize: "300px 100%",
              animation: "selahShimmer 1.4s infinite linear",
            }}
          />
          <div className="mb-2.5 h-[15px] w-[85%] rounded bg-[var(--skel)]" />
          <div className="mb-1.5 h-[11px] w-full rounded bg-[var(--skel)]" />
          <div className="h-[11px] w-[55%] rounded bg-[var(--skel)]" />
        </div>
      ))}
    </div>
  );
}
