const js = require("@eslint/js");
const globals = require("globals");
const tseslint = require("typescript-eslint");

// Flat-config migration of the previous .eslintrc.js - same intended rule
// set (eslint:recommended + @typescript-eslint/recommended, no custom
// rules), just expressed in ESLint 9's flat format. One deliberate fix: the
// old config's `env: { browser: true }` was never actually exercised (lint
// never ran under ESLint 9), and was almost certainly copy-pasted from a
// frontend template - this is a Node/Express backend, so `globals.node` is
// used instead to avoid a flood of false no-undef errors on
// process/require/module/__dirname across nearly every file.
module.exports = tseslint.config(
    { ignores: ["dist", "storage", "public"] },
    {
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        files: ["**/*.ts"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: globals.node,
        },
    }
);
