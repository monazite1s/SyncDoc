import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDir: __dirname,
});

const eslintConfig = compat.config({
  extends: ['next/core-web-vitals', 'next/typescript', 'prettier'],
  rules: {
    // 代码大小限制
    'max-lines': ['warn', { max: 400, skipBlankLines: true, skipComments: true }],
    'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],
    'max-depth': ['warn', 4],

    // 不可变数据
    'no-param-reassign': ['error', { props: true }],
    'prefer-const': 'error',

    // TypeScript 严格检查
    '@typescript-eslint/no-explicit-any': 'error',
  },
});

export default eslintConfig;
