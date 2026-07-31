import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotFoundError, OutOfStockError, ValidationError } from "@/shared/errors";
import { makeDb, queue, type DbStub } from "./harness";

const db = vi.hoisted(() => ({ current: null as unknown as DbStub }));
const auditLog = vi.hoisted(() => vi.fn());

vi.mock("@/server/db", () => ({
  get db() {
    return db.current;
  },
  getDb: () => db.current,
}));

vi.mock("@/server/services/admin.service", () => ({ auditLog }));

vi.mock("@/server/db/queries", () => ({
  getVariantStock: vi.fn(),
  listStockGrid: vi.fn(),
}));

const { decrementStock, setStock } = await import(
  "@/server/services/inventory.service"
);

beforeEach(() => {
  vi.clearAllMocks();
  db.current = makeDb();
});

/**
 * Stock can never go negative.
 *
 * The guarantee lives in SQL — the UPDATE carries `WHERE stock >= qty`, so a
 * row without the stock simply does not match and no amount of concurrent
 * traffic can drive it below zero. A unit test cannot observe the WHERE clause,
 * so what it checks is the half that is in TypeScript: when the guarded update
 * matches nothing, the service refuses loudly instead of carrying on as though
 * it had worked. Concurrency itself is Postgres's job and is only really
 * provable against a real database.
 */
describe("decrementStock", () => {
  it("throws when the guarded update matches no row", async () => {
    queue(db.current.update, []); // the WHERE stock >= qty guard bit

    await expect(
      decrementStock(db.current as never, [{ variantId: 1, qty: 3 }]),
    ).rejects.toBeInstanceOf(OutOfStockError);
  });

  it("stops at the first line that cannot be satisfied", async () => {
    queue(db.current.update, [{ id: 1 }], []); // first ok, second short

    await expect(
      decrementStock(db.current as never, [
        { variantId: 1, qty: 1 },
        { variantId: 2, qty: 99 },
      ]),
    ).rejects.toBeInstanceOf(OutOfStockError);

    // Two attempts, then it gave up rather than trying the rest.
    expect(db.current.update).toHaveBeenCalledTimes(2);
  });

  it("takes every line when all are satisfiable", async () => {
    queue(db.current.update, [{ id: 1 }], [{ id: 2 }], [{ id: 3 }]);

    await expect(
      decrementStock(db.current as never, [
        { variantId: 1, qty: 1 },
        { variantId: 2, qty: 2 },
        { variantId: 3, qty: 1 },
      ]),
    ).resolves.toBeUndefined();

    expect(db.current.update).toHaveBeenCalledTimes(3);
  });

  it("does nothing for an empty order", async () => {
    await expect(
      decrementStock(db.current as never, []),
    ).resolves.toBeUndefined();
    expect(db.current.update).not.toHaveBeenCalled();
  });
});

describe("setStock", () => {
  it("refuses a negative figure", async () => {
    await expect(
      setStock({ variantId: 1, qty: -1, actorUserId: "admin" }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(db.current.transaction).not.toHaveBeenCalled();
  });

  it("refuses an absurd figure — a mis-keyed extra zero", async () => {
    await expect(
      setStock({ variantId: 1, qty: 100_000, actorUserId: "admin" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("refuses a non-finite figure", async () => {
    await expect(
      setStock({ variantId: 1, qty: Number.NaN, actorUserId: "admin" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("refuses an unknown variant", async () => {
    queue(db.current.select, []);
    await expect(
      setStock({ variantId: 404, qty: 5, actorUserId: "admin" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("writes the audit row inside the same transaction as the change", async () => {
    queue(db.current.select, [{ stock: 3, sku: "KOHL-M" }]);

    const result = await setStock({
      variantId: 1,
      qty: 7,
      actorUserId: "admin-1",
    });

    expect(result).toEqual({ variantId: 1, before: 3, after: 7 });
    // The tx handle, not the pool — this is what makes the log and the state
    // impossible to disagree.
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "admin-1",
        action: "stock.update",
        meta: { sku: "KOHL-M", before: 3, after: 7 },
      }),
      db.current,
    );
  });

  it("accepts the boundary values", async () => {
    queue(db.current.select, [{ stock: 1, sku: "KOHL-M" }]);
    await expect(
      setStock({ variantId: 1, qty: 0, actorUserId: "a" }),
    ).resolves.toMatchObject({ after: 0 });

    db.current = makeDb();
    queue(db.current.select, [{ stock: 1, sku: "KOHL-M" }]);
    await expect(
      setStock({ variantId: 1, qty: 9999, actorUserId: "a" }),
    ).resolves.toMatchObject({ after: 9999 });
  });
});
