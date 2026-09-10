import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "happy-dom",
    globals: true,
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
    env: {
      NODE_ENV: "test",
      JWT_SECRET: "test-super-secret-jwt-key-for-vitest-32-chars-long",
    },
  },
});
