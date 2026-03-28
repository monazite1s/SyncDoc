import { createConfig } from '@collab/eslint-config';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
    baseDir: __dirname,
});

const nextConfig = compat.config({
    extends: ['next/core-web-vitals'],
});

export default [...createConfig({ tsconfigPath: './tsconfig.json' }), ...nextConfig];
