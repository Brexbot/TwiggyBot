module.exports = {
  env: {
    browser: true,
    node: true,
    es2020: true,
  },
  extends: [
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'plugin:prettier/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    'no-unused-vars': [2, { args: 'all', argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-unused-vars': [2, { args: 'all', argsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      files: ['**/*.ts'],
      rules: {
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': ['error'],
      },
    },
    {
      files: ['src/commands/*.ts'],
      rules: {
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': 'off'
      },
    },
    {
      files: ['*.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off'
      },
    },
  ],
};
