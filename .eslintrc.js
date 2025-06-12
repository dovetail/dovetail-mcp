module.exports = {
  ignorePatterns: [
    ".yarn/",
    "**/.cache/",
    "**/dist/",
  ],
  overrides: [
    {
      files: ["*.{ts,tsx,cts,js,jsx,cjs}"],
      parserOptions: {
        // Allows using modern syntax like `const` etc.
        ecmaVersion: "latest",
      },
      rules: {
        "no-var": "error",
      },
    },
    {
      files: ["*.{tsx,ts}"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        sourceType: "module",
        ecmaFeatures: {
          modules: true,
          jsx: true,
        },
        project: true,
      },
      plugins: ["@typescript-eslint", "deprecation", "import", "jest"],
      rules: {
        curly: ["error", "all"],
        eqeqeq: ["error", "smart"],
        "import/no-extraneous-dependencies": "error",
        "jest/no-focused-tests": "error",
        "no-caller": "error",
        "no-console": "error",
        "no-debugger": "error",
        "no-eval": "error",
        "no-new-wrappers": "error",
        "no-sequences": "error",
        "no-throw-literal": "error",
        "no-unsafe-finally": "error",
        "no-var": "error",
        "object-shorthand": ["error", "always"],
        "prefer-const": "error",
        radix: "error",

        "no-useless-constructor": "off",
        "@typescript-eslint/no-useless-constructor": "error",
        "@typescript-eslint/no-base-to-string": "error",
        "@typescript-eslint/await-thenable": "error",
        "@typescript-eslint/ban-types": [
          "error",
          {
            extendDefaults: false,
            types: {
              // add a custom message, AND tell the plugin how to fix it
              String: {
                message: "Use string instead",
                fixWith: "string",
              },
              "{}": {
                message: "Use object instead",
                fixWith: "object",
              },
              Object: {
                message: "Use object instead",
                fixWith: "object",
              },
              Branded: {
                message: "Use correct type exported from `@dvtl/toolbox`, e.g. `codec.Uuid`",
              },
              "t.Branded": {
                message: "Use correct type exported from `@dvtl/toolbox`, e.g. `codec.Uuid`",
              },
            },
          },
        ],
        "@typescript-eslint/consistent-type-assertions": [
          "error",
          {
            assertionStyle: "as",
            objectLiteralTypeAssertions: "never",
          },
        ],
        "@typescript-eslint/consistent-type-imports": ["error"],
        "@typescript-eslint/naming-convention": [
          "error",
          { selector: "enumMember", format: ["PascalCase"] },
          // Future rule:
          // {
          //   selector: "variable",
          //   modifiers: ["const", "exported"],
          //   types: ["boolean", "array", "number", "string"],
          //   format: ["PascalCase"],
          // },
        ],
        "@typescript-eslint/no-empty-interface": "error",
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/no-floating-promises": "error",
        "@typescript-eslint/no-require-imports": "error",
        "@typescript-eslint/no-unnecessary-condition": [
          "error",
          {
            allowConstantLoopConditions: true,
          },
        ],
        "@typescript-eslint/no-unnecessary-type-assertion": "error",
        // Note: you must disable the base rule as it can report incorrect errors
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": [
          "error",
          { argsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_", varsIgnorePattern: "^_" },
        ],
        "@typescript-eslint/no-non-null-assertion": "error",
        "@typescript-eslint/prefer-nullish-coalescing": "error",
        "@typescript-eslint/prefer-optional-chain": "error",
        "@typescript-eslint/prefer-readonly": "error",
        "@typescript-eslint/prefer-ts-expect-error": "error",
        "@typescript-eslint/return-await": ["error", "in-try-catch"],
        "@typescript-eslint/require-array-sort-compare": ["error", { ignoreStringArrays: true }],
        "@typescript-eslint/restrict-template-expressions": [
          "error",
          { allowAny: true, allowBoolean: true, allowNumber: true },
        ],
        "@typescript-eslint/strict-boolean-expressions": [
          "error",
          { allowAny: true, allowNullableBoolean: true, allowNullableObject: true, allowNumber: false },
        ],
        "@typescript-eslint/switch-exhaustiveness-check": "error",
        "deprecation/deprecation": "error",
      },
    },
    
 
  ],
};
