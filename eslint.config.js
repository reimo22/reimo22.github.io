import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: [
      "_site/**",
      "node_modules/**",
      "src/writeups/boxes/**",
      ".superpowers/**",
    ],
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
  {
    // Node, but their page.evaluate() callbacks are serialized and run in
    // the browser, so both global sets are legitimately in scope here.
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },
  {
    // Browser scripts, loaded with a plain <script> tag — not modules.
    files: ["src/assets/js/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        ...globals.browser,
      },
    },
  },
];
