import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-integration/**",
    "docs/qa/**",
    "temp/**",
    "out/**",
    "build/**",
    "archive/**",
    // Imported, prebuilt animation runtime and model decoder.
    "public/assets/js/**",
    "public/assets/draco/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
