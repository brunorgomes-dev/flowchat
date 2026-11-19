<?php

use App\Http\Controllers\AdminContaController;
use App\Http\Controllers\AgendamentoController;
use App\Http\Controllers\AnexoEtapaController;
use App\Http\Controllers\AnexoMensagemController;
use App\Http\Controllers\CadastroController;
use App\Http\Controllers\ConectarMessengerController;
use App\Http\Controllers\ConfiguracoesController;
use App\Http\Controllers\ContaSuspensaController;
use App\Http\Controllers\ConversaController;
use App\Http\Controllers\ConviteController;
use App\Http\Controllers\ExecutarFluxoController;
use App\Http\Controllers\FluxoController;
use App\Http\Controllers\HistoricoContatoController;
use App\Http\Controllers\LoginController;
use App\Http\Controllers\PaginaInicialController;
use App\Http\Controllers\ResponderContatoController;
use App\Http\Controllers\WebhookMessengerController;
use Illuminate\Support\Facades\Route;

// Autenticação: páginas públicas de entrada e criação de conta
Route::middleware('guest')->group(function () {
    Route::get('/login', [LoginController::class, 'criar'])->name('login');
    Route::post('/login', [LoginController::class, 'entrar'])->name('login.entrar');
    Route::get('/login/sessoes', [LoginController::class, 'sessoes'])->name('login.sessoes');
    Route::post('/login/sessoes/{sessao}/substituir', [LoginController::class, 'substituirSessao'])->name('login.sessoes.substituir');
    Route::post('/login/sessoes/cancelar', [LoginController::class, 'cancelarLoginPendente'])->name('login.sessoes.cancelar');
    Route::get('/cadastro', [CadastroController::class, 'criar'])->name('cadastro');
    Route::post('/cadastro', [CadastroController::class, 'registrar'])->name('cadastro.registrar');
    Route::get('/convites/{token}', [ConviteController::class, 'aceitar'])
        ->middleware('throttle:10,1')
        ->name('convites.aceitar');
    Route::post('/convites/{token}', [ConviteController::class, 'registrar'])
        ->middleware('throttle:10,1')
        ->name('convites.registrar');
});

Route::post('/sair', [LoginController::class, 'sair'])->middleware('auth')->name('sair');

// Página pública de orientação para contas suspensas
Route::get('/conta-suspensa', ContaSuspensaController::class)->name('conta.suspensa');

// Páginas internas: exigem sessão autenticada e conta ativa
Route::middleware(['auth', 'conta.ativa'])->group(function () {
    Route::get('/', ConversaController::class)->name('pagina-inicial');

    Route::get('/painel', PaginaInicialController::class)->name('painel');

    Route::get('/contatos/{contato}/historico', HistoricoContatoController::class)->name('contatos.historico');
    Route::get('/contatos/{contato}/mensagens', [HistoricoContatoController::class, 'mensagens'])->name('contatos.mensagens');

    Route::post('/contatos/{contato}/responder', ResponderContatoController::class)->name('contatos.responder');

    Route::get('/conversas', ConversaController::class)->name('conversas.index');
    Route::get('/conversas/mais', [ConversaController::class, 'mais'])->name('conversas.mais');
    Route::get('/configuracoes', ConfiguracoesController::class)->name('configuracoes.index');
    Route::get('/configuracoes/conexao', [ConfiguracoesController::class, 'conexao'])->name('configuracoes.conexao');
    Route::post('/configuracoes/fuso', [ConfiguracoesController::class, 'atualizarFuso'])->name('configuracoes.fuso');
    Route::post('/configuracoes/messenger', [ConfiguracoesController::class, 'atualizarMessenger'])->name('configuracoes.messenger');
    Route::get('/configuracoes/messenger/conectar', [ConectarMessengerController::class, 'redirecionar'])->name('messenger.oauth.iniciar');
    Route::get('/configuracoes/messenger/retorno', [ConectarMessengerController::class, 'retorno'])->name('messenger.oauth.retorno');
    Route::get('/configuracoes/messenger/paginas', [ConectarMessengerController::class, 'paginas'])->name('messenger.oauth.paginas');
    Route::post('/configuracoes/messenger/paginas', [ConectarMessengerController::class, 'selecionarPagina'])->name('messenger.oauth.selecionar');
    Route::post('/configuracoes/messenger/cancelar-conexao', [ConectarMessengerController::class, 'cancelar'])->name('messenger.oauth.cancelar');
    Route::delete('/configuracoes/messenger', [ConectarMessengerController::class, 'desconectar'])->name('messenger.desconectar');

    Route::get('/fluxos', [FluxoController::class, 'index'])->name('fluxos.index');
    Route::get('/fluxos/criar', [FluxoController::class, 'create'])->name('fluxos.create');
    Route::get('/fluxos/{fluxo}/editar', [FluxoController::class, 'edit'])->name('fluxos.edit');
    Route::get('/fluxos/{fluxo}/etapas/{etapa}/anexo', AnexoEtapaController::class)->name('fluxos.etapas.anexo');
    Route::post('/fluxos', [FluxoController::class, 'store'])->name('fluxos.store');
    Route::put('/fluxos/{fluxo}', [FluxoController::class, 'update'])->name('fluxos.update');
    Route::delete('/fluxos/{fluxo}', [FluxoController::class, 'destroy'])->name('fluxos.destroy');

    Route::get('/mensagens/{mensagem}/anexo', AnexoMensagemController::class)->name('mensagens.anexo');

    Route::post('/execucoes/manuais', ExecutarFluxoController::class)->name('execucoes.manuais.store');

    Route::get('/agendamentos', [AgendamentoController::class, 'index'])->name('agendamentos.index');
    Route::post('/agendamentos', [AgendamentoController::class, 'store'])->name('agendamentos.store');
    Route::post('/agendamentos/{agendamento}/cancelar', [AgendamentoController::class, 'cancelar'])->name('agendamentos.cancelar');
});

Route::middleware(['auth', 'conta.ativa', 'admin.plataforma'])
    ->prefix('admin/convites')
    ->name('admin.convites.')
    ->group(function (): void {
        Route::get('/', [ConviteController::class, 'index'])->name('index');
        Route::get('/emitir', [ConviteController::class, 'criar'])->name('create');
        Route::post('/', [ConviteController::class, 'emitir'])->middleware('throttle:20,1')->name('emitir');
        Route::delete('/{convite}', [ConviteController::class, 'revogar'])->name('revogar');
    });

Route::middleware(['auth', 'conta.ativa', 'admin.plataforma'])
    ->prefix('admin/contas')
    ->name('admin.contas.')
    ->group(function (): void {
        Route::post('/{account}/suspender', [AdminContaController::class, 'suspender'])->name('suspender');
        Route::post('/{account}/reativar', [AdminContaController::class, 'reativar'])->name('reativar');
    });

/*
 * Área de legado — páginas antigas, autenticadas, com os mesmos controllers.
 *
 * O nome das rotas começa com "legado." para que App\Support\Design escolha o
 * componente antigo. As ações de escrita continuam nos endpoints de produção;
 * esta área é uma referência visual, não uma segunda aplicação.
 */
Route::middleware('guest')->group(function (): void {
    Route::get('/legado/entrar', [LoginController::class, 'criar'])->name('legado.login');
    Route::get('/legado/cadastro', [CadastroController::class, 'criar'])->name('legado.cadastro');
    Route::get('/legado/login/sessoes', [LoginController::class, 'sessoes'])->name('legado.login.sessoes');
});

Route::get('/legado/conta-suspensa', ContaSuspensaController::class)->name('legado.conta.suspensa');

Route::middleware(['auth', 'conta.ativa'])
    ->prefix('legado')
    ->name('legado.')
    ->group(function (): void {
        Route::get('/', ConversaController::class)->name('pagina-inicial');
        Route::get('/painel', PaginaInicialController::class)->name('painel');
        Route::get('/conversas', ConversaController::class)->name('conversas.index');
        Route::get('/contatos/{contato}/historico', HistoricoContatoController::class)->name('contatos.historico');
        Route::get('/fluxos', [FluxoController::class, 'index'])->name('fluxos.index');
        Route::get('/fluxos/criar', [FluxoController::class, 'create'])->name('fluxos.create');
        Route::get('/fluxos/{fluxo}/editar', [FluxoController::class, 'edit'])->name('fluxos.edit');
        Route::get('/agendamentos', [AgendamentoController::class, 'index'])->name('agendamentos.index');
        Route::get('/configuracoes', ConfiguracoesController::class)->name('configuracoes.index');
    });

Route::middleware(['auth', 'conta.ativa', 'admin.plataforma'])
    ->prefix('legado/admin/convites')
    ->name('legado.admin.convites.')
    ->group(function (): void {
        Route::get('/', [ConviteController::class, 'index'])->name('index');
        Route::get('/emitir', [ConviteController::class, 'criar'])->name('create');
    });

// Webhook do Messenger: chamado pelo Facebook, sem sessão autenticada
Route::get('/webhook/messenger', [WebhookMessengerController::class, 'verificar']);
Route::post('/webhook/messenger', [WebhookMessengerController::class, 'receber']);
