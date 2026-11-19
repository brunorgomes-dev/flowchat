<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\FusosHorarios;
use Closure;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ConfiguracoesController extends Controller
{
    /**
     * Página de configurações: aparência (tema) e configurações regionais
     * da conta (fuso horário).
     */
    public function __invoke(Request $request): Response
    {
        $utilizador = $request->user();
        $dadosFuso = $utilizador?->dadosFusoHorario();

        return Inertia::render('V2/Configuracoes', [
            // A configuração regional pertence à conta (usuário proprietário),
            // não a fluxos individuais — esta é a base para o futuro
            // isolamento multi-conta
            'fuso' => $utilizador ? [
                'atual' => $dadosFuso['timezone'],
                'confirmado' => $dadosFuso['confirmado'],
                'disponivel' => $this->fusoDisponivel(),
            ] : null,
            'fusos' => FusosHorarios::listar(),
            'messenger' => $this->dadosIntegracaoMessenger($utilizador),
        ]);
    }

    /**
     * Página de conexão do Messenger, dentro de Configurações.
     */
    public function conexao(Request $request): Response
    {
        return Inertia::render('V2/Conexao', [
            'messenger' => $this->dadosIntegracaoMessenger($request->user()),
        ]);
    }

    /**
     * Salva a Página do Messenger desta conta sem devolver o token ao cliente.
     */
    public function atualizarMessenger(Request $request): RedirectResponse
    {
        if (! Schema::hasTable('messenger_integrations')) {
            throw ValidationException::withMessages([
                'page_id' => 'A estrutura de integração Messenger por conta ainda não está disponível.',
            ]);
        }

        $conta = $request->user()->account;

        if ($conta === null) {
            throw ValidationException::withMessages([
                'page_id' => 'Este usuário ainda não está associado a uma conta.',
            ]);
        }

        $integracaoAtual = $conta->messengerIntegration;
        $tokenObrigatorio = $integracaoAtual === null
            || $request->input('page_id') !== $integracaoAtual->page_id;

        $dados = $request->validate([
            'page_id' => [
                'required', 'string', 'max:64',
                Rule::unique('messenger_integrations', 'page_id')->ignore($integracaoAtual?->id),
            ],
            'page_access_token' => [$tokenObrigatorio ? 'required' : 'nullable', 'string', 'max:4096'],
        ], [
            'page_id.required' => 'Informe o ID da Página do Facebook.',
            'page_id.unique' => 'Esta Página já está vinculada a outra conta.',
            'page_access_token.required' => 'Informe o token de acesso da Página.',
            'page_access_token.max' => 'O token informado é muito longo.',
        ]);

        $atributos = ['page_id' => $dados['page_id']];

        if (is_string($dados['page_access_token'] ?? null) && $dados['page_access_token'] !== '') {
            $atributos['page_access_token'] = $dados['page_access_token'];
        }

        $conta->messengerIntegration()->updateOrCreate([], $atributos);

        return redirect()->route('configuracoes.index')
            ->with('mensagem', 'Integração do Messenger atualizada com segurança.');
    }

    /**
     * Confirma e salva o fuso horário da conta. A escolha manual feita
     * nesta página é sempre uma confirmação explícita do usuário.
     */
    public function atualizarFuso(Request $request): RedirectResponse
    {
        if (! $this->fusoDisponivel()) {
            throw ValidationException::withMessages([
                'timezone' => 'A estrutura de fuso horário ainda não está disponível neste banco de dados.',
            ]);
        }

        // Validação no backend contra a base IANA: offsets fixos
        // (ex.: UTC+01:00) e identificadores inventados são rejeitados
        $dados = $request->validate([
            'timezone' => [
                'required', 'string', 'max:64',
                function (string $atributo, mixed $valor, Closure $falha): void {
                    if (! FusosHorarios::identificadorValido(is_string($valor) ? $valor : null)) {
                        $falha('Selecione um fuso horário válido da lista.');
                    }
                },
            ],
            // false apenas quando o cliente guarda o fuso detectado como
            // pendente (modal "Agora não"); nesta página, omitir é confirmar
            'timezone_confirmado' => ['nullable', 'boolean'],
        ], [
            'timezone.required' => 'Selecione um fuso horário.',
            'timezone.max' => 'O identificador do fuso horário é muito longo.',
            'timezone_confirmado.boolean' => 'O estado de confirmação do fuso horário é inválido.',
        ]);

        $utilizador = $request->user();
        $atributosFuso = [
            'timezone' => $dados['timezone'],
            'timezone_confirmado' => ($dados['timezone_confirmado'] ?? true) === true,
        ];

        if (Schema::hasTable('accounts') && Schema::hasColumn('users', 'account_id')) {
            $conta = $utilizador->account;

            if ($conta === null) {
                throw ValidationException::withMessages([
                    'timezone' => 'Este usuário ainda não está associado a uma conta.',
                ]);
            }

            $conta->update($atributosFuso);
        } else {
            // Compatibilidade temporária antes da migration da estrutura de contas
            $utilizador->update($atributosFuso);
        }

        // Volta para a página de origem (dashboard no modal pós-cadastro,
        // Configurações na página regional) em vez de forçar /configuracoes
        return redirect()->back(fallback: route('configuracoes.index'))
            ->with('mensagem', 'Fuso horário confirmado com sucesso. Os horários dos agendamentos passarão a considerar a sua região.');
    }

    /**
     * Indica se a configuração regional está disponível no esquema atual.
     */
    private function fusoDisponivel(): bool
    {
        return (Schema::hasTable('accounts') && Schema::hasColumn('accounts', 'timezone'))
            || Schema::hasColumn('users', 'timezone');
    }

    /**
     * Propriedades seguras da integração para exibição, sem incluir o token.
     *
     * @return array{disponivel: bool, page_id: string|null, configurado: bool}
     */
    private function dadosIntegracaoMessenger(?User $utilizador): array
    {
        $disponivel = Schema::hasTable('messenger_integrations');
        $conta = $disponivel ? $utilizador?->account : null;
        $integracao = $conta?->messengerIntegration;
        $appIdConfigurado = is_string(config('services.messenger.app_id'))
            && config('services.messenger.app_id') !== '';
        $appSecretConfigurado = is_string(config('services.messenger.app_secret'))
            && config('services.messenger.app_secret') !== '';

        return [
            'disponivel' => $disponivel,
            'page_id' => $integracao?->page_id,
            'configurado' => $integracao !== null,
            'oauth_disponivel' => $appIdConfigurado && $appSecretConfigurado,
            'callback_url' => $appIdConfigurado ? route('messenger.oauth.retorno') : null,
        ];
    }
}
