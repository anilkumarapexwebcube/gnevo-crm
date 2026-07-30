// Shared flat ESLint config for the Gnevo CRM monorepo.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      // Intentionally OFF: this rule (without type-aware linting) rewrites
      // `import { X }` → `import type { X }` for NestJS providers injected by
      // constructor type. With `emitDecoratorMetadata`, that erases the runtime
      // metadata Nest needs and BREAKS dependency injection at runtime (compiles
      // fine, app won't boot). Re-enable only alongside type-checked linting
      // (parserOptions.projectService), which respects emitDecoratorMetadata.
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
  {
    ignores: ['**/dist/**', '**/.next/**', '**/node_modules/**', '**/coverage/**'],
  },
);
