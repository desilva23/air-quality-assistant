import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import sonarjs from "eslint-plugin-sonarjs";
import tseslint from "typescript-eslint";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx,mts}"],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
      // Next's config API and mock implementations are async by contract.
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      "@typescript-eslint/no-confusing-void-expression": ["error", { ignoreArrowShorthand: true }],
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      // User content must never reach the logs; errors are logged deliberately.
      "no-console": ["error", { allow: ["error"] }],
      eqeqeq: "error",
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: ["zod", "zod/mini"].map((name) => ({
            name,
            message: 'Use `import * as z from "@/lib/zod"`, which configures Zod Mini.',
          })),
        },
      ],
    },
  },
  // SonarQube's own JavaScript and TypeScript rules (SonarJS), at zero findings.
  { files: ["**/*.{ts,tsx,mts}"], ...sonarjs.configs.recommended },
  { files: ["src/lib/zod.ts"], rules: { "@typescript-eslint/no-restricted-imports": "off" } },
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      // Parse outside data with Zod instead of casting it. `as const` is still allowed.
      "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
      // Keep every unit small enough to read in one go.
      complexity: ["error", 10],
      "max-depth": ["error", 3],
      "max-params": ["error", 4],
      "max-nested-callbacks": ["error", 3],
      "max-lines-per-function": ["error", { max: 80, skipBlankLines: true, skipComments: true }],
      "max-lines": ["error", { max: 250, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ["tests/**/*.{ts,tsx}", "e2e/**/*.ts"],
    rules: {
      // Mocks and `Response.json()` are untyped by nature.
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "reports/**",
    "next-env.d.ts",
  ]),
]);
