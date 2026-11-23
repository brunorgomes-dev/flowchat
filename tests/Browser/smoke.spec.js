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

test('agenda, filtra e cancela um agendamento', async ({ page }) => {
    await page.goto('/agendamentos');

    const daquiDuasHoras = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const valorLocal = new Date(daquiDuasHoras.getTime() - daquiDuasHoras.getTimezoneOffset() * 60_000)
        .toISOString()
        .slice(0, 16);

    await page.locator('#ag-fluxo').selectOption({ label: 'Fluxo E2E' });
    await page.locator('#ag-contato').selectOption({ label: 'Contato E2E' });
    await page.locator('#ag-data').fill(valorLocal);
    await page.getByRole('button', { name: 'Agendar', exact: true }).click();

    await expect(page.getByText('Agendamento criado')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Pendente' })).toBeVisible();

    await page.getByRole('button', { name: 'Pendentes', exact: true }).click();
    await expect(page.getByRole('cell', { name: 'Pendente' })).toBeVisible();

    await page.getByRole('row').filter({ hasText: 'Fluxo E2E' })
        .getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar agendamento', exact: true }).click();

    await expect(page.getByText('Agendamento cancelado')).toBeVisible();
    await expect(page.getByText('Nenhum agendamento neste estado')).toBeVisible();

    await page.getByRole('button', { name: 'Todos', exact: true }).click();
    await expect(page.getByRole('cell', { name: 'Cancelado' })).toBeVisible();
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

    test('senha errada mostra erro e nao entra', async ({ page }) => {
        await page.goto('/login');
        await page.locator('#login-email').fill(`naoexiste-${Date.now()}@example.test`);
        await page.locator('#login-senha').fill('senha-errada');
        await page.getByRole('button', { name: 'Entrar' }).click();

        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByText('Estas credenciais não correspondem a uma conta.')).toBeVisible();
    });
});
