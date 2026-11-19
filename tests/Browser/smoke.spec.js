import { expect, test } from '@playwright/test';

test('painel abre', async ({ page }) => {
    await page.goto('/painel');
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

test('conversa abre a ficha do contato', async ({ page }) => {
    await page.goto('/conversas');
    await page.getByRole('button', { name: 'Abrir primeira conversa' }).click();
    await expect(page).toHaveURL(/contato=/, { timeout: 15_000 });
});

test('cria fluxo com etapa, salva e recarrega', async ({ page }) => {
    await page.goto('/fluxos/criar');

    await page.getByLabel('Nome do fluxo').fill('Fluxo Playwright');
    await page.getByLabel('Texto da etapa 1').fill('Mensagem criada pelo teste');
    await page.getByRole('button', { name: 'Adicionar etapa' }).click();
    await page.getByLabel('Texto da etapa 2').fill('Segunda mensagem do teste');

    await page.getByRole('button', { name: 'Criar fluxo' }).click();
    await page.waitForURL(/\/fluxos\/\d+\/editar$/, { timeout: 15_000 });

    await page.reload();
    await expect(page.getByLabel('Nome do fluxo')).toHaveValue('Fluxo Playwright');
});

test('nenhuma tela responde 5xx nem loga erro no console', async ({ page }) => {
    const falhas = [];
    const erros = [];

    page.on('response', (resposta) => {
        if (resposta.status() >= 500) {
            falhas.push(`${resposta.status()} ${resposta.url()}`);
        }
    });

    page.on('console', (mensagem) => {
        if (mensagem.type() === 'error') {
            erros.push(mensagem.text());
        }
    });

    for (const caminho of ['/painel', '/conversas', '/fluxos', '/agendamentos', '/configuracoes']) {
        const resposta = await page.goto(caminho);

        expect(resposta?.status(), caminho).toBeLessThan(500);
    }

    expect(falhas).toEqual([]);
    expect(erros).toEqual([]);
});

test.describe('sessao', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('entrar e sair encerram a sessao', async ({ page }) => {
        await page.goto('/login');
        await page.locator('#login-email').fill('e2e@example.test');
        await page.locator('#login-senha').fill('senha-e2e');
        await page.getByRole('button', { name: 'Entrar' }).click();
        await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });

        await page.getByRole('button', { name: 'Encerrar sessão' }).first().click();
        await expect(page).toHaveURL(/\/login$/);

        await page.goto('/painel');
        await expect(page).toHaveURL(/\/login$/);
    });
});
