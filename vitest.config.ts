import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/lib/**/*.ts", "src/app/api/**/*.ts"],
      exclude: [
        "src/lib/auth.ts",
        "src/lib/auth-types.ts",
        "src/lib/db.ts",
        "src/lib/utils.ts",
        "**/*.d.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
