import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    rules: {
      "@next/next/no-css-tags": "off",
      "import/no-anonymous-default-export": "off"
    }
  },
  globalIgnores([".next/**", "coverage/**", "playwright-report/**", "test-results/**", "public/assets/**"])
]);
