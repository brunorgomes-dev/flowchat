<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

/**
 * Área de preview de design V2.
 *
 * Este controller é apenas um adaptador de rotas: todas as telas usam fixtures
 * estáticas em resources/js/Pages/Preview/DesignV2/_data/demonstracao.js.
 * Nenhum model é consultado, nenhum dado do cliente é lido e nenhuma escrita,
 * job, webhook ou chamada externa é disparada por estas páginas.
 *
 * A proteção fica nos middlewares de rota: auth, conta.ativa,
 * preview.design-v2 e, nas telas administrativas, admin.plataforma.
 */
class PreviewDesignV2Controller extends Controller
{
    public function mapa(): Response
    {
        return $this->renderizar('Mapa');
    }

    public function painel(): Response
    {
        return $this->renderizar('Painel');
    }

    public function conversas(): Response
    {
        return $this->renderizar('Conversas');
    }

    public function historicoContato(): Response
    {
        return $this->renderizar('HistoricoContato');
    }

    public function fluxos(): Response
    {
        return $this->renderizar('Fluxos');
    }

    public function editorFluxo(): Response
    {
        return $this->renderizar('EditorFluxo');
    }

    public function agendamentos(): Response
    {
        return $this->renderizar('Agendamentos');
    }

    public function configuracoes(): Response
    {
        return $this->renderizar('Configuracoes');
    }

    public function conexao(): Response
    {
        return $this->renderizar('Conexao');
    }

    public function adminContas(): Response
    {
        return $this->renderizar('AdminContas');
    }

    public function adminConvites(): Response
    {
        return $this->renderizar('AdminConvites');
    }

    public function entrar(): Response
    {
        return $this->renderizar('Login');
    }

    public function cadastro(): Response
    {
        return $this->renderizar('Cadastro');
    }

    public function sessoes(): Response
    {
        return $this->renderizar('SessoesLogin');
    }

    public function selecionarPagina(): Response
    {
        return $this->renderizar('SelecionarPagina');
    }

    public function contaSuspensa(): Response
    {
        return $this->renderizar('ContaSuspensa');
    }

    private function renderizar(string $tela): Response
    {
        return Inertia::render("Preview/DesignV2/{$tela}");
    }
}
