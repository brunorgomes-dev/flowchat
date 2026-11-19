import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from '@playwright/test';

const PORTA = 8001;
const BASE = `http://127.0.0.1:${PORTA}`;
const ARQUIVO_BANCO = path.resolve(import.meta.dirname, 'database/e2e.sqlite');

// Banco descartavel: o guard do E2eSeeder recusa rodar se o caminho nao terminar em e2e.sqlite.
if (!fs.existsSync(ARQUIVO_BANCO)) {
    fs.writeFileSync(ARQUIVO_BANCO, '');
}

const AMBIENTE = {
    APP_ENV: 'e2e',
    APP_DEBUG: 'true',
    APP_KEY: 'base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
    APP_URL: BASE,
    DB_CONNECTION: 'sqlite',
    DB_DATABASE: ARQUIVO_BANCO,
    CACHE_STORE: 'file',
    SESSION_DRIVER: 'file',
    QUEUE_CONNECTION: 'database',
    MAIL_MAILER: 'log',
    BCRYPT_ROUNDS: '4',
};

export default defineConfig({
    testDir: './tests/Browser',
    fullyParallel: false,
    workers: 1,
    retries: 0,
    timeout: 30_000,
    expect: { timeout: 5_000 },
    reporter: [['list']],
    use: {
        baseURL: BASE,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    webServer: {
        command:
            'php artisan migrate:fresh --force && php artisan db:seed --class=E2eSeeder --force && php artisan serve --port=8001',
        url: `${BASE}/up`,
        timeout: 120_000,
        reuseExistingServer: false,
        env: { ...process.env, ...AMBIENTE },
    },
});
