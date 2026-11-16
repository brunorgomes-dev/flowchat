<?php

namespace App\Http\Controllers;

use App\Models\Agendamento;
use App\Models\Fluxo;
use App\Support\Design;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AgendamentoController extends Controller
{
    /**
     * Página de agendamento de fluxos com os agendamentos cadastrados.
     */
    public function index(Request $request): Response
    {
        $conta = $request->user()->account;

        return Inertia::render(Design::componente('V2/Agendamentos', 'Agendamentos'), [
            'fluxos' => $conta->fluxos()->orderBy('id')->get(['id', 'nome']),
            'contatos' => $conta->contatos()->orderBy('id')->get(['id', 'psid', 'nome']),
            'agendamentos' => $conta->agendamentos()->with('fluxo:id,nome', 'contato:id,psid,nome')->orderBy('id')->get(),
        ]);
    }

    /**
     * Cria um agendamento; o fluxo só é iniciado no horário agendado.
     */
    public function store(Request $request): RedirectResponse
    {
        $utilizador = $request->user();

        // Enquanto o fuso horário da conta não estiver confirmado, novos
        // agendamentos ficam bloqueados: o horário informado precisa ser
        // interpretado numa região conhecida para não enviar mensagens
        // fora de hora. Enquanto a migration de fuso não correr, o
        // comportamento atual é preservado.
        if ($this->fusoDisponivel() && ! $utilizador->fusoConfirmado()) {
            throw ValidationException::withMessages([
                'executar_em' => 'Confirme o seu fuso horário em Configurações antes de criar agendamentos.',
            ]);
        }

        $dados = $request->validate([
            'fluxo_id' => ['required', 'integer'],
            'contato_id' => ['required', 'integer'],
            'executar_em' => ['required', 'date'],
        ], [
            'executar_em.required' => 'Informe a data e o horário do agendamento.',
            'executar_em.date' => 'Informe uma data e hora válidas.',
        ]);

        // Interpreta o horário informado no fuso confirmado da conta
        // (ex.: Europe/Lisbon), respeitando o horário de verão pela base IANA
        $executarEm = Carbon::parse($dados['executar_em'], $utilizador->fusoHorarioEfetivo());

        if ($executarEm->isPast()) {
            throw ValidationException::withMessages([
                'executar_em' => 'A data e hora do agendamento devem ser no futuro.',
            ]);
        }

        $fluxo = $utilizador->account->fluxos()->find($dados['fluxo_id']);
        $contato = $utilizador->account->contatos()->find($dados['contato_id']);
        if ($fluxo === null || $contato === null) {
            throw ValidationException::withMessages(['fluxo_id' => 'Selecione um fluxo e contato pertencentes à sua conta.']);
        }

        $utilizador->account->agendamentos()->create([
            ...$dados,
            // Instância normalizada para o fuso da aplicação: a coluna
            // executar_em continua comparável com now() na varredura
            // agendamentos:processar e no job, exatamente como hoje
            'executar_em' => $executarEm->timezone(config('app.timezone')),
            'estado' => 'pendente',
        ]);

        return redirect()->route('agendamentos.index');
    }

    /**
     * Cancela um agendamento ainda pendente.
     */
    public function cancelar(Request $request, int $agendamento): RedirectResponse
    {
        $request->user()->account->agendamentos()->where('id', $agendamento)
            ->where('estado', 'pendente')
            ->update(['estado' => 'cancelado']);

        return redirect()->route('agendamentos.index');
    }

    /**
     * Indica se as colunas de fuso horário já existem na tabela de usuários.
     */
    private function fusoDisponivel(): bool
    {
        return Schema::hasColumn('users', 'timezone');
    }
}
