import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq, sql } from "drizzle-orm";
import NextAuth from "next-auth";
import type { Adapter } from "next-auth/adapters";

import authConfig from "./auth.config";
import { db, getDb } from "@/lib/db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
  type UserRole,
} from "@/lib/db/schema";

/**
 * Emails that get the admin role, from ADMIN_EMAILS as a comma-separated list.
 * Parsed once per process; changing the env var needs a redeploy, which is the
 * right friction for granting admin.
 */
function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

const isAllowlisted = (email: string | null | undefined) =>
  Boolean(email) && adminEmails().has(email!.trim().toLowerCase());

/**
 * Writes the admin role to the user row.
 *
 * Matched on lower(email) rather than on id, because this runs at two points in
 * the sign-in flow and only one of them has an id to hand. Guarded on the
 * current role so a repeat sign-in is not a pointless write.
 *
 * The database is the source of truth on purpose. Promoting only in the token
 * would mean admin status silently disappearing whenever the JWT is reissued,
 * and would leave no record anything privileged had been granted.
 */
async function promoteToAdmin(email: string | null | undefined) {
  if (!isAllowlisted(email)) return;
  try {
    await db
      .update(users)
      .set({ role: "admin" })
      .where(
        sql`lower(${users.email}) = ${email!.trim().toLowerCase()} and ${users.role} <> 'admin'`,
      );
  } catch (error) {
    // Never block a sign-in on this. A failed promotion means the user gets in
    // as a customer, which is the safe direction to fail in.
    console.error("[auth] admin promotion failed", error);
  }
}

/** Authoritative role read. Falls back to customer if the row has gone. */
async function roleFor(userId: string): Promise<UserRole> {
  try {
    const [row] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return row?.role ?? "customer";
  } catch (error) {
    console.error("[auth] role lookup failed", error);
    return "customer";
  }
}

/**
 * The adapter, built on first use rather than at import.
 *
 * DrizzleAdapter has to be handed the real client — it selects its dialect with
 * drizzle's `is()`, which fails against the lazy proxy `db` exports. But
 * building the client eagerly needs DATABASE_URL at module load, which breaks
 * `next build` on any machine without one, and this module is imported by every
 * page that calls auth().
 *
 * So the construction is deferred to the first adapter method Auth.js actually
 * calls. `has` is trapped as well as `get` because Auth.js feature-detects the
 * optional methods before using them.
 */
function lazyDrizzleAdapter(): Adapter {
  let real: Adapter | undefined;
  const resolve = () => {
    real ??= DrizzleAdapter(getDb(), {
      usersTable: users,
      accountsTable: accounts,
      sessionsTable: sessions,
      verificationTokensTable: verificationTokens,
    });
    return real;
  };

  return new Proxy({} as Adapter, {
    get: (_target, prop, receiver) => Reflect.get(resolve(), prop, receiver),
    has: (_target, prop) => Reflect.has(resolve(), prop),
    ownKeys: () => Reflect.ownKeys(resolve()),
    getOwnPropertyDescriptor: (_target, prop) => {
      const descriptor = Reflect.getOwnPropertyDescriptor(resolve(), prop);
      // ownKeys must agree with this trap or the proxy invariant throws.
      return descriptor && { ...descriptor, configurable: true };
    },
  });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  adapter: lazyDrizzleAdapter(),

  callbacks: {
    ...authConfig.callbacks,

    async signIn({ user }) {
      // Covers every sign-in where the row already exists. A brand-new OAuth
      // user may not have been written yet at this point, which is what the
      // createUser event below is for.
      await promoteToAdmin(user.email);
      return true;
    },

    async jwt({ token, user, trigger }) {
      if (user?.id) {
        token.id = user.id;
        // Read the role back rather than trusting what the adapter handed us:
        // the promotion above may have landed after this user object was built.
        token.role = await roleFor(user.id);
        return token;
      }

      // `update` is the client calling useSession().update() — the one moment
      // we are asked to refresh, so re-read the role. Ordinary rotations at
      // updateAge deliberately do not hit the database.
      if (trigger === "update" && token.id) {
        token.role = await roleFor(token.id);
      }

      return token;
    },
  },

  events: {
    // First-time OAuth and magic-link users are created after the signIn
    // callback has run, so the allowlist is applied again here. The jwt
    // callback reads the role after both have had their turn.
    async createUser({ user }) {
      await promoteToAdmin(user.email);
    },
  },
});
