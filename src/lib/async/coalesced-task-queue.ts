type TaskRunner<T> = (payload: T) => Promise<void>;

interface CoalescedTask<T> {
  payload: T;
  resolvers: Array<{
    resolve: () => void;
    reject: (error: unknown) => void;
  }>;
}

/**
 * Runs async work serially; rapid enqueue calls coalesce to the latest payload
 * and all waiters resolve after that payload is processed.
 */
export function createCoalescedTaskQueue<T>(run: TaskRunner<T>) {
  let pending: CoalescedTask<T> | null = null;
  let draining = false;

  async function drain() {
    if (draining) return;
    draining = true;
    try {
      while (pending) {
        const task = pending;
        pending = null;
        try {
          await run(task.payload);
          for (const waiter of task.resolvers) waiter.resolve();
        } catch (error) {
          for (const waiter of task.resolvers) waiter.reject(error);
        }
      }
    } finally {
      draining = false;
      if (pending) void drain();
    }
  }

  return function enqueue(payload: T): Promise<void> {
    return new Promise((resolve, reject) => {
      if (pending) {
        pending.payload = payload;
        pending.resolvers.push({ resolve, reject });
      } else {
        pending = { payload, resolvers: [{ resolve, reject }] };
      }
      queueMicrotask(() => void drain());
    });
  };
}
