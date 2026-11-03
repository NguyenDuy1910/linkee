import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      // `server-only` throws outside React Server Components; tests run in plain Node.
      "server-only": path.resolve(__dirname, "tests/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: {
      AUTH_SECRET: "test-secret-test-secret-test-secret",
      TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
      DATABASE_URL: "postgresql://unused:unused@localhost:1/unused",
      APP_URL: "https://linkee.test",
      INSTAGRAM_APP_SECRET: "ig-test-secret",
      META_APP_SECRET: "fb-test-secret",
    },
  },
});
