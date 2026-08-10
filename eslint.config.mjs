import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  {
    ignores: [".next/**", "node_modules/**", "coverage/**", "data/**"],
  },
  ...compat.extends("next/core-web-vitals"),
  {
    // Existing Thai UI strings contain literal quotation marks in JSX.
    rules: { "react/no-unescaped-entities": "off" },
  },
];

export default config;
