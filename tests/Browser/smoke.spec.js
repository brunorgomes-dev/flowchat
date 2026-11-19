import { expect, test } from '@playwright/test';

const EMAIL = 'e2e@example.test';
const SENHA = 'senha-e2e';

test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.locator('#login-email').fill(EMAIL);
    await page.locator('#login-senha').fill(SENHA);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 10_000 });
});

test('painel abre', async ({ page }) => {
    await expect(page.getByRole('heading').first()).toBeVisible();
});

test('conversas lista o contato semeado', async ({ page }) => {
    await page.goto('/conversas');
    await expect(page.getByText('Contato E2E').first()).toBeVisible();
});

test('fluxos lista o fluxo semeado', async ({ page }) => {
    await page.goto('/fluxos');
    await expect(page.getByText('Fluxo E2E').first()).toBeVisible();
});

test('editor de fluxo abre', async ({ page }) => {
    await page.goto('/fluxos/criar');
    await expect(page.getByText('Novo fluxo').first()).toBeVisible();
});

test('nenhuma tela responde 5xx', async ({ page }) => {
    const falhas = [];

    page.on('response', (resposta) => {
        if (resposta.status() >= 500) {
            falhas.push(`${resposta.status()} ${resposta.url()}`);
        }
    });

    for (const caminho of ['/painel', '/conversas', '/fluxos', '/agendamentos', '/configuracoes']) {
        const resposta = await page.goto(caminho);

        expect(resposta?.status(), caminho).toBeLessThan(500);
    }

    expect(falhas).toEqual([]);
});
