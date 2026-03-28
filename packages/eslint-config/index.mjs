import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';

/**
 * 创建 ESLint flat config
 * @param {{ tsconfigPath?: string }} options - 传入 tsconfig.json 路径启用 type-aware 规则
 */
export function createConfig({ tsconfigPath } = {}) {
    const parserOptions = {
        ecmaVersion: 'latest',
        sourceType: 'module',
    };

    // Type-aware 规则 (需要 tsconfig)
    const typeAwareRules = {};

    if (tsconfigPath) {
        parserOptions.project = tsconfigPath;
        parserOptions.tsconfigRootDir = process.cwd();

        // 捕获真实 bug 的 type-aware 规则
        typeAwareRules['@typescript-eslint/await-thenable'] = 'error';
        typeAwareRules['@typescript-eslint/no-floating-promises'] = 'error';
        typeAwareRules['@typescript-eslint/no-misused-promises'] = 'error';
        typeAwareRules['@typescript-eslint/no-unnecessary-condition'] = 'warn';
        typeAwareRules['@typescript-eslint/no-unnecessary-type-assertion'] = 'warn';
        typeAwareRules['@typescript-eslint/require-await'] = 'error';
    }

    return [
        {
            ignores: [
                'node_modules/',
                'dist/',
                '.next/',
                'coverage/',
                '*.js',
                '*.mjs',
                '*.cjs',
            ],
        },
        {
            files: ['**/*.ts', '**/*.tsx'],
            languageOptions: {
                parser: tsparser,
                parserOptions,
            },
            plugins: {
                '@typescript-eslint': tseslint,
            },
            rules: {
                // 代码大小限制
                'max-lines': ['warn', { max: 400, skipBlankLines: true, skipComments: true }],
                'max-lines-per-function': [
                    'warn',
                    { max: 50, skipBlankLines: true, skipComments: true },
                ],
                'max-depth': ['warn', 4],

                // 不可变数据
                'no-param-reassign': ['error', { props: true }],
                'prefer-const': 'error',

                // TypeScript 基础规则
                '@typescript-eslint/no-unused-vars': [
                    'error',
                    { argsIgnorePattern: '^_', ignoreRestSiblings: true },
                ],
                '@typescript-eslint/no-explicit-any': 'error',

                // Type-aware 规则
                ...typeAwareRules,
            },
        },
        // prettier 兼容 (必须放最后，关闭格式冲突规则)
        prettier,
    ];
}

// 默认导出: 无 type-aware 规则
export default createConfig();
