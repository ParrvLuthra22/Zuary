import { vi } from "vitest";

/**
 * A stand-in for a drizzle query builder.
 *
 * Drizzle chains — `.select().from().where().limit()` — and only resolves when
 * awaited. This returns a thenable proxy: every property access hands back
 * another proxy so any chain length works, and awaiting at any point resolves
 * to the value it was built with.
 *
 * Deliberately does not model SQL. These tests are about the decisions the
 * service makes given what the database returned, not about whether the query
 * is correct — that needs a real Postgres and belongs in the e2e suite.
 */
export function result<T>(value: T): T & PromiseLike<T> {
  const proxy: unknown = new Proxy(function noop() {} as never, {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve: (v: T) => unknown, reject?: (e: unknown) => unknown) =>
          Promise.resolve(value).then(resolve, reject);
      }
      return () => proxy;
    },
    apply: () => proxy,
  });
  return proxy as T & PromiseLike<T>;
}

export type DbStub = {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  transaction: ReturnType<typeof vi.fn>;
  execute: ReturnType<typeof vi.fn>;
};

/**
 * A db whose four verbs each return whatever the test queued next.
 *
 * `transaction` runs its callback against the same stub, so a service that
 * composes work into a transaction is exercised rather than skipped — which
 * matters, because the ordering inside those transactions is the thing several
 * of these tests are actually checking.
 */
export function makeDb(): DbStub {
  const db: DbStub = {
    select: vi.fn(() => result([])),
    insert: vi.fn(() => result([])),
    update: vi.fn(() => result([])),
    delete: vi.fn(() => result([])),
    execute: vi.fn(() => result([])),
    transaction: vi.fn(async (fn: (tx: DbStub) => unknown) => fn(db)),
  };
  return db;
}

/** Queues per-call return values for one verb, in order. */
export function queue(fn: ReturnType<typeof vi.fn>, ...values: unknown[]) {
  for (const value of values) fn.mockImplementationOnce(() => result(value));
}
