import js from "@eslint/js";
import globals from "globals";
import prettierConfig from "eslint-config-prettier";

export default [
    js.configs.recommended,
    prettierConfig,
    {
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: "module",
            globals: {
                ...globals.node,
                ...globals.jest,
            },
        },
        rules: {
            "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
            "no-console": "off",
            "no-duplicate-imports": "error",
            "prefer-const": "warn",
            "no-var": "error",
            eqeqeq: ["error", "always"],
            curly: ["error", "multi-line"],
            "no-throw-literal": "error",
        },
    },
    {
        ignores: ["node_modules/", "logs/", "coverage/", "public/", "deploy/", "documentacao/"],
    },
];
