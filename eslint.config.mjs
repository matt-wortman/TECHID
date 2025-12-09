import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  // Extend Next.js core-web-vitals config (includes TypeScript support)
  ...compat.extends('next/core-web-vitals', 'next/typescript'),

  // Global ignores
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'coverage/**',
      'node_modules/**',
      '*.config.js',
      '*.config.mjs',
      'jest.setup.js',
      'next-env.d.ts',
      'prisma/seed/**',
      'tests/reporters/**',
    ],
  },

  // Custom rules for TypeScript files
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // Allow unused vars prefixed with underscore
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Prefer const over let when possible
      'prefer-const': 'warn',
      // Warn on console.log (but allow console.error/warn)
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // Test file overrides - more relaxed rules
  {
    files: ['**/*.test.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    rules: {
      // Allow any in tests for flexibility
      '@typescript-eslint/no-explicit-any': 'off',
      // Allow non-null assertions in tests
      '@typescript-eslint/no-non-null-assertion': 'off',
      // Allow console in tests
      'no-console': 'off',
    },
  },

  // Logger file - allow console statements (it's the logger!)
  {
    files: ['**/logger.ts'],
    rules: {
      'no-console': 'off',
    },
  },
]

export default eslintConfig
