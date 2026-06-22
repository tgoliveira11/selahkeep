# Known Issues

_None currently open._

## Resolved

### Test suite heap OOM (was: `Ineffective mark-compacts near heap limit`)

**Resolved.** Running the suite (notably `notes-refinements`, `notes-toolbar-refinement`,
`notes-ui-patterns`, `editor-track-2`, `authenticated-ui-refinement`) aborted with a
V8 out-of-memory error.

**Root cause:** several feature tests mocked `useVaultIndex` (and similar hooks) with
`vi.fn(() => ({ ... }))`, returning a **new object every render**. The notes list page
has `useEffect(..., [index])`; a fresh `index` reference each render made that effect
re-run → `setState` → re-render → … an infinite render loop that exhausted the worker
heap. Production was never affected (the real `useVaultIndex` returns a stable, memoized
value). It was not a Node version issue (reproduced on Node 22 and 25).

**Fix:** the mocks now return a **stable reference** (built once, reused across renders;
lazily cached where they capture other test constants). A global Testing Library
`cleanup()` in `src/test/setup.ts` also unmounts trees between tests. The full suite now
runs green in one `vitest run`.

**Guard when writing tests:** any hook mock whose result is used in an effect dependency
must return a stable reference across renders (define the object once; do not build it
inside `vi.fn(() => ({...}))`).
