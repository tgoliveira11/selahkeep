import { describe, expect, it } from "vitest";
import { createCoalescedTaskQueue } from "@/lib/async/coalesced-task-queue";

describe("createCoalescedTaskQueue", () => {
  it("coalesces rapid enqueues to the latest payload", async () => {
    const processed: number[] = [];
    const enqueue = createCoalescedTaskQueue<number>(async (value) => {
      processed.push(value);
    });

    await Promise.all([enqueue(1), enqueue(2), enqueue(3)]);

    expect(processed).toEqual([3]);
  });

  it("runs saves serially when enqueued after the prior save completes", async () => {
    const processed: number[] = [];
    let release: (() => void) | null = null;
    const enqueue = createCoalescedTaskQueue<number>(async (value) => {
      processed.push(value);
      if (value === 1) {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      }
    });

    const first = enqueue(1);
    await Promise.resolve();
    const second = enqueue(2);
    release?.();
    await Promise.all([first, second]);

    expect(processed).toEqual([1, 2]);
  });
});
