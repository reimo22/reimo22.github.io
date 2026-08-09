import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: ["_site/**", "node_modules/**", "src/writeups/boxes/**"],
  },
  js.configs.recommended,
  {
    files: [".eleventy.js", "eslint.config.js", "src/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
  },
];
