<?php

use App\Http\Controllers\AgendamentoController;
use App\Http\Controllers\ConfiguracoesController;
use App\Http\Controllers\ConversaController;
use App\Http\Controllers\ExecutarFluxoController;
use App\Http\Controllers\FluxoController;
use App\Http\Controllers\HistoricoContatoController;
use App\Http\Controllers\PaginaInicialController;
use App\Http\Controllers\ResponderContatoController;
use App\Http\Controllers\WebhookMessengerController;
use Illuminate\Support\Facades\Route;

Route::get('/', ConversaController::class)->name('pagina-inicial');

Route::get('/painel', PaginaInicialController::class)->name('painel');

Route::get('/contatos/{contato}/historico', HistoricoContatoController::class)->name('contatos.historico');

Route::post('/contatos/{contato}/responder', ResponderContatoController::class)->name('contatos.responder');

Route::get('/conversas', ConversaController::class)->name('conversas.index');
Route::get('/configuracoes', ConfiguracoesController::class)->name('configuracoes.index');

Route::get('/fluxos', [FluxoController::class, 'index'])->name('fluxos.index');
Route::post('/fluxos', [FluxoController::class, 'store'])->name('fluxos.store');
Route::put('/fluxos/{fluxo}', [FluxoController::class, 'update'])->name('fluxos.update');

Route::post('/execucoes/manuais', ExecutarFluxoController::class)->name('execucoes.manuais.store');

Route::get('/agendamentos', [AgendamentoController::class, 'index'])->name('agendamentos.index');
Route::post('/agendamentos', [AgendamentoController::class, 'store'])->name('agendamentos.store');
Route::post('/agendamentos/{agendamento}/cancelar', [AgendamentoController::class, 'cancelar'])->name('agendamentos.cancelar');

Route::get('/webhook/messenger', [WebhookMessengerController::class, 'verificar']);
Route::post('/webhook/messenger', [WebhookMessengerController::class, 'receber']);
