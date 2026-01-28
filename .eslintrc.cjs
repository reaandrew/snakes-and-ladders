module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './packages/*/tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'import'],
  settings: {
    'import/resolver': {
      typescript: {
        project: ['./tsconfig.json', './packages/*/tsconfig.json'],
      },
    },
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'import/no-unresolved': 'off',
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
    'import/no-duplicates': 'error',
  },
  ignorePatterns: [
    'dist',
    'node_modules',
    'coverage',
    'storybook-static',
    '*.config.js',
    '*.config.cjs',
    '*.config.ts',
    '.eslintrc.cjs',
  ],
  overrides: [
    {
      files: ['packages/frontend/**/*.ts', 'packages/frontend/**/*.tsx'],
      parserOptions: {
        project: './packages/frontend/tsconfig.json',
      },
    },
    {
      files: ['packages/backend/**/*.ts'],
      parserOptions: {
        project: './packages/backend/tsconfig.json',
      },
    },
    {
      files: ['packages/shared/**/*.ts'],
      parserOptions: {
        project: './packages/shared/tsconfig.json',
      },
    },
  ],
};
