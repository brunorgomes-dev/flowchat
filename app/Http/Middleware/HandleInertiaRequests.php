<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Support\FusosHorarios;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user() ? [
                    'id' => $request->user()->id,
                    'name' => $request->user()->name,
                    'email' => $request->user()->email,
                    'admin_plataforma' => $request->user()->isAdministradorPlataforma(),
                    // Configuração regional da conta (identificador IANA +
                    // confirmação): alimenta o aviso de configuração pendente
                    'fuso' => $this->fusoDoUtilizador($request->user()),
                ] : null,
            ],
            'flash' => [
                'mensagem' => $request->session()->get('mensagem'),
                'cadastro_publico' => config('flowchat.cadastro_publico'),
                // Sinal do cadastro: abre uma única vez o modal de confirmação
                // do fuso horário; a lista IANA só é montada neste momento
                'fuso_confirmar' => $request->session()->get('fuso_confirmar'),
                'fusos' => $request->session()->get('fuso_confirmar') ? FusosHorarios::listar() : null,
            ],
        ];
    }

    /**
     * Fuso horário da conta para a interface: disponibilidade das colunas
     * (migration), identificador atual e estado de confirmação. Só é
     * calculado para sessões autenticadas — o webhook não paga esta consulta.
     * Usa as colunas antigas do usuário enquanto a migration de contas estiver pendente.
     *
     * @return array{atual: string|null, confirmado: bool, disponivel: bool}|null
     */
    private function fusoDoUtilizador(User $utilizador): ?array
    {
        $contaDisponivel = Schema::hasTable('accounts')
            && Schema::hasColumn('users', 'account_id')
            && Schema::hasColumn('accounts', 'timezone');

        if (! $contaDisponivel && ! Schema::hasColumn('users', 'timezone')) {
            return null;
        }

        $fuso = $utilizador->dadosFusoHorario();

        return [
            'atual' => $fuso['timezone'],
            'confirmado' => $fuso['confirmado'],
            'disponivel' => true,
        ];
    }
}
