import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    /*
     * The layer boundary: nothing under /client may reach into /server.
     *
     * `import "server-only"` already makes this fail at build time, but it fails
     * with a stack trace pointing at the package, several files away from the
     * import that caused it. This rule names the offending line in the editor
     * before a build is ever run.
     *
     * Two carve-outs, both deliberate:
     *
     * allowTypeImports — a dozen client components take their prop types from
     * the query layer and the Drizzle schema (`Address`, `ValidatedLine`,
     * `OrderStatus`). `import type` is erased by the compiler, so no server code
     * reaches the browser and server-only never fires. Banning it would mean
     * duplicating those shapes by hand and letting them drift.
     *
     * @/server/actions/* — a `"use server"` module is the sanctioned way for a
     * client component to reach the server. The import compiles to an RPC
     * reference, not to the function body, so nothing server-side is bundled.
     * Blocking it would ban server actions outright, which is the opposite of
     * what this layout is for.
     */
    files: ["client/**/*.ts", "client/**/*.tsx"],
    rules: {
      // The base rule has no allowTypeImports; the typescript-eslint version
      // does, so the base one is turned off to keep them from both firing.
      "no-restricted-imports": "off",
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              /*
               * The banned subtrees are named rather than written as
               * "@/server/** minus actions". These are gitignore-style
               * patterns, so a bare directory name already covers everything
               * beneath it — and a negation like "!@/server/actions/**" does
               * not survive a preceding "@/server", which matches the whole
               * tree as a directory and silently re-bans what the negation was
               * meant to allow.
               *
               * A new top-level directory under /server must be added to this
               * list or it will not be guarded here. server-only still catches
               * it at build time; this list is what makes it fail in the editor
               * first, with the offending line highlighted.
               */
              group: [
                "@/server/db",
                "@/server/auth",
                "@/server/services",
                "@/server/components",
                "@/server/http",
                "@/server/validators",
              ],
              message:
                "Client code cannot import from /server. Pass the data in as a prop from a server component, or call a server action from @/server/actions. Type-only imports are allowed.",
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
