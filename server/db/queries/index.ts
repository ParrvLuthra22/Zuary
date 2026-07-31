import "server-only";

/**
 * Barrel for the query layer.
 *
 * The domain files are the real modules; this exists so a caller that needs
 * three domains does not need three import lines, and so the old single
 * `@/server/db/queries` path had somewhere to land during the move.
 */
export * from "./types";
export * from "./products";
export * from "./inventory";
export * from "./orders";
export * from "./users";
