import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
    {
        ignores: [
            'public/build/**',
            'vendor/**',
            'node_modules/**',
            'storage/**',
            'resources/js/Pages/Preview/**',
        ],
    },
    {
        files: ['resources/js/**/*.{js,jsx}'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
            },
            parserOptions: {
                ecmaFeatures: { jsx: true },
            },
        },
        plugins: {
            'react-hooks': reactHooks,
        },
        rules: {
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        },
    },
];
