import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["node_modules/", "tools/serial-bridge/node_modules/"] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_|^next$|^req$|^res$" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "smart"],
      "prefer-const": "error",
    },
  },
  {
    // The seed prints the device key; the bridge is a CLI
    files: ["src/seed/**", "tools/**"],
    rules: { "no-console": "off" },
  },
];
