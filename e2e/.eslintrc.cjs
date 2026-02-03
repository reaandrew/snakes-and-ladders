module.exports = {
  extends: ['../.eslintrc.cjs'],
  rules: {
    // Disable strict type checking for E2E tests - Playwright uses any types extensively
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    // Allow non-null assertions in tests
    '@typescript-eslint/no-non-null-assertion': 'off',
  },
};
