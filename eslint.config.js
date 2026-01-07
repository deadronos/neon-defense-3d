import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import prettierPlugin from 'eslint-plugin-prettier';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
import sonarjsPlugin from 'eslint-plugin-sonarjs';
import unicornPlugin from 'eslint-plugin-unicorn';

export default [
  {
    ignores: [
      '**/node_modules/**',
      'dist/**',
      'build/**',
      '.vite/**',
      'public/**',
      'coverage/**',
      '.cache/**',
      '.git/**',
      '.github/**',
      '.codex/**',
      '**/*.min.js',
      '**/*.bundle.js',
    ],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        project: ['./tsconfig.json'],
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'react-refresh': reactRefreshPlugin,
      'jsx-a11y': jsxA11yPlugin,
      import: importPlugin,
      prettier: prettierPlugin,
      sonarjs: sonarjsPlugin,
      unicorn: unicornPlugin,
    },
    settings: {
      react: { version: 'detect' },
      'import/resolver': { typescript: {} },
    },
    rules: {
      // Prettier
      'prettier/prettier': 'error',

      // React Core
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/jsx-no-leaked-render': 'warn',
      'react/jsx-no-constructed-context-values': 'warn',
      'react/jsx-key': ['error', { checkFragmentShorthand: true }],
      'react/no-array-index-key': 'warn',

      // React Hooks (Critical for game loop)
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',

      // React Refresh (HMR)
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // TypeScript - Existing
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

      // TypeScript - Strictness (New)
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/strict-boolean-expressions': [
        'warn',
        { allowNullableBoolean: true, allowNullableString: true },
      ],
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',

      // Import/Module
      'import/no-unresolved': 'error',
      'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
      'import/no-duplicates': 'error',
      'import/no-cycle': 'error',
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          pathGroups: [{ pattern: '@/**', group: 'internal' }],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],

      // Code Quality
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      complexity: ['warn', 15],
      'max-lines-per-function': ['warn', { max: 150, skipComments: true, skipBlankLines: true }],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSEnumDeclaration',
          message: 'Prefer union types over enums for better tree-shaking',
        },
      ],

      // SonarJS - Code Smells
      'sonarjs/cognitive-complexity': ['warn', 15],
      'sonarjs/no-duplicate-string': ['warn', { threshold: 5 }],
      'sonarjs/no-identical-functions': 'warn',
      'sonarjs/no-inverted-boolean-check': 'error',
      'sonarjs/no-redundant-boolean': 'error',
      'sonarjs/no-unused-collection': 'warn',
      'sonarjs/prefer-immediate-return': 'warn',
      'sonarjs/prefer-single-boolean-return': 'warn',

      // Unicorn - Modern JS Patterns
      'unicorn/better-regex': 'warn',
      'unicorn/catch-error-name': ['error', { name: 'err' }],
      'unicorn/consistent-function-scoping': 'warn',
      'unicorn/no-array-for-each': 'warn',
      'unicorn/no-null': 'off', // Allow null where needed
      'unicorn/prefer-array-find': 'error',
      'unicorn/prefer-array-flat-map': 'warn',
      'unicorn/prefer-array-some': 'warn',
      'unicorn/prefer-default-parameters': 'warn',
      'unicorn/prefer-includes': 'error',
      'unicorn/prefer-modern-math-apis': 'warn',
      'unicorn/prefer-node-protocol': 'error',
      'unicorn/prefer-number-properties': 'warn',
      'unicorn/prefer-optional-catch-binding': 'warn',
      'unicorn/prefer-string-starts-ends-with': 'error',
      'unicorn/prefer-ternary': 'warn',
      'unicorn/throw-new-error': 'error',
    },
  },
  {
    files: ['src/game/**/*.tsx', 'src/components/**/*.tsx'],
    rules: { 'react/no-unknown-property': 'off' },
  },
];
