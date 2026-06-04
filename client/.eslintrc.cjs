/* ESLint (FE-01) — TypeScript + React Hooks + Prettier 정합 */
module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.3' } },
  plugins: ['@typescript-eslint', 'react-hooks', 'react-refresh'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  ignorePatterns: ['dist', 'node_modules', '*.cjs', 'vite.config.ts', 'postcss.config.js', 'tailwind.config.js'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      // 컴포넌트가 아닌 .ts 모듈(스토어/훅/유틸/api)에는 fast-refresh 규칙 미적용.
      files: ['**/*.ts'],
      rules: { 'react-refresh/only-export-components': 'off' },
    },
  ],
};
