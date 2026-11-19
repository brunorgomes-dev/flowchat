import { expect, test as setup } from '@playwright/test';

const ARQUIVO_ESTADO = 'tests/Browser/.auth/estado.json';

setup('autentica', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#login-email').fill('e2e@example.test');
    await page.locator('#login-senha').fill('senha-e2e');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });
    await expect(page.locator('body')).not.toContainText('Estas credenciais');

    await page.context().storageState({ path: ARQUIVO_ESTADO });
});
