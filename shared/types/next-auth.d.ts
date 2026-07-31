import type { DefaultSession } from "next-auth";

import type { UserRole } from "@/server/db/schema";

/**
 * `id` and `role` are ours. Auth.js ships neither on the session by default —
 * `role` is not part of the adapter's user model at all, so it has to be
 * declared here as well as selected in the jwt callback.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }

  /** The shape the adapter hands to the callbacks. */
  interface User {
    role?: UserRole;
  }
}

declare module "next-auth/adapters" {
  interface AdapterUser {
    role: UserRole;
  }
}

/*
 * `@auth/core/jwt`, not `next-auth/jwt`. The latter is a bare re-export, so
 * augmenting it declares a second, unrelated interface and every token field
 * silently stays `unknown`.
 */
declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
  }
}
