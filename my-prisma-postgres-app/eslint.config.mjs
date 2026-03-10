import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

const nextConfig = nextPlugin.configs["core-web-vitals"];

export default [
  {
    ignores: [".next/**", "lib/generated/**", "node_modules/**"],
  },
  {
    ...nextConfig,
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      ...(nextConfig.plugins || {}),
      "@typescript-eslint": tseslint,
    },
  },
];
