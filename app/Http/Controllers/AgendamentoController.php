<?php

namespace App\Http\Controllers;

use App\Models\Agendamento;
use App\Models\Contato;
use App\Models\Fluxo;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AgendamentoController extends Controller
{
    /**
     * Página de agendamento de fluxos com os agendamentos cadastrados.
     */
    public function index(): Response
    {
        return Inertia::render('Agendamentos', [
            'fluxos' => Fluxo::orderBy('id')->get(['id', 'nome']),
            'contatos' => Contato::orderBy('id')->get(['id', 'psid', 'nome']),
            'agendamentos' => Agendamento::with('fluxo:id,nome', 'contato:id,psid,nome')->orderBy('id')->get(),
        ]);
    }

    /**
     * Cria um agendamento; o fluxo só é iniciado no horário agendado.
     */
    public function store(Request $request): RedirectResponse
    {
        $dados = $request->validate([
            'fluxo_id' => ['required', 'integer', 'exists:fluxos,id'],
            'contato_id' => ['required', 'integer', 'exists:contatos,id'],
            'executar_em' => ['required', 'date', 'after:now'],
        ]);

        Agendamento::create([...$dados, 'estado' => 'pendente']);

        return redirect()->route('agendamentos.index');
    }

    /**
     * Cancela um agendamento ainda pendente.
     */
    public function cancelar(Request $request, Agendamento $agendamento): RedirectResponse
    {
        Agendamento::where('id', $agendamento->id)
            ->where('estado', 'pendente')
            ->update(['estado' => 'cancelado']);

        return redirect()->route('agendamentos.index');
    }
}
