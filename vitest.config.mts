import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

/**
 * Aliases are declared by hand rather than read from tsconfig with a plugin.
 * There are five of them, they change about once a year, and the plugin that
 * reads them pulls a vite peer range that conflicts with the one Next ships.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@/server": `${root}server`,
      "@/client": `${root}client`,
      "@/shared": `${root}shared`,
      "@/app": `${root}app`,
      "@/emails": `${root}emails`,
      /*
       * `server-only` throws unless the importer sets the react-server export
       * condition, which vitest does not. Every module under /server carries
       * that banner, so without this alias the whole suite fails on import.
       * Pointing it at the package's own empty.js is exactly what a bundler
       * does for a server component.
       */
      "server-only": `${root}node_modules/server-only/empty.js`,
      // client-only inverts the convention: its index.js is the no-op and
      // error.js is the one that throws.
      "client-only": `${root}node_modules/client-only/index.js`,
    },
  },
  test: {
    environment: "node",
    include: ["{server,shared,client}/**/__tests__/**/*.test.ts"],
    // Playwright specs live in /e2e and are run by `npm run test:e2e`. Without
    // this they get collected here and fail on a missing test runner.
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
  },
});
