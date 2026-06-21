/**
 * Dependency-free line diff for GitHub-style version comparison.
 *
 * Operates entirely on already-decrypted, in-memory text. Uses a
 * Longest-Common-Subsequence (LCS) table over lines, then walks it to produce
 * an ordered list of added / removed / unchanged lines with 1-based line
 * numbers on each side. No content ever leaves the client.
 */

export type DiffLineType = "added" | "removed" | "unchanged";

export interface DiffLine {
  type: DiffLineType;
  value: string;
  /** 1-based line number in the "before" text (null for added lines). */
  leftLine: number | null;
  /** 1-based line number in the "after" text (null for removed lines). */
  rightLine: number | null;
}

export interface DiffStats {
  added: number;
  removed: number;
  unchanged: number;
}

function splitLines(text: string): string[] {
  if (text === "") return [];
  return text.split("\n");
}

/** Build LCS length table for two line arrays. */
function lcsTable(a: string[], b: string[]): number[][] {
  const table: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0)
  );
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] =
        a[i] === b[j]
          ? table[i + 1][j + 1] + 1
          : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  return table;
}

/**
 * Compute a line-by-line diff between `before` and `after`.
 * Returns lines in display order (top to bottom).
 */
export function diffLines(before: string, after: string): DiffLine[] {
  const a = splitLines(before);
  const b = splitLines(after);
  const table = lcsTable(a, b);

  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;
  let leftNo = 1;
  let rightNo = 1;

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      result.push({ type: "unchanged", value: a[i], leftLine: leftNo, rightLine: rightNo });
      i++;
      j++;
      leftNo++;
      rightNo++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      result.push({ type: "removed", value: a[i], leftLine: leftNo, rightLine: null });
      i++;
      leftNo++;
    } else {
      result.push({ type: "added", value: b[j], leftLine: null, rightLine: rightNo });
      j++;
      rightNo++;
    }
  }
  while (i < a.length) {
    result.push({ type: "removed", value: a[i], leftLine: leftNo, rightLine: null });
    i++;
    leftNo++;
  }
  while (j < b.length) {
    result.push({ type: "added", value: b[j], leftLine: null, rightLine: rightNo });
    j++;
    rightNo++;
  }

  return result;
}

export function diffStats(lines: DiffLine[]): DiffStats {
  return lines.reduce<DiffStats>(
    (acc, line) => {
      acc[line.type]++;
      return acc;
    },
    { added: 0, removed: 0, unchanged: 0 }
  );
}

/** True when the two texts are identical (no added/removed lines). */
export function isUnchanged(lines: DiffLine[]): boolean {
  return lines.every((line) => line.type === "unchanged");
}
