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
    "public/assets/login/assets/js/learn.js",
    "public/assets/login/assets/js/chunks/**",
    "public/assets/home/assets/js/home.js",
    "public/assets/home/assets/js/chunks/**",
    "public/assets/home/assets/draco/**",
    "public/assets/draco/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
