import globals from 'globals'
import pluginJs from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettierRecommended from 'eslint-plugin-prettier/recommended'

/** @type {import('eslint').Linter.Config[]} */
export default [
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  prettierRecommended,
  // {
  //   files: [
  //     "**/*.{js,mjs,cjs,ts}"
  //   ]
  // },
  {
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    rules: {
      'no-unused-vars': ['off'],
      'no-useless-escape': ['off'],
      //"@typescript-eslint/no-unused-vars": ["off"],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          varsIgnorePattern: '^[_A-Z]', // Ignore underscores variables and classes which start with captial letter
          argsIgnorePattern: '^_',
          ignoreClassWithStaticInitBlock: true,
        },
      ],
    },
  },
  {
    ignores: ['prisma/*', 'node_modules/*', 'build/*'],
  },
]
