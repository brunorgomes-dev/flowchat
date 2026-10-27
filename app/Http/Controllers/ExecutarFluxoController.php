<?php

namespace App\Http\Controllers;

use App\Jobs\EnviarEtapaFluxo;
use App\Models\Contato;
use App\Models\ExecucaoFluxo;
use App\Models\Fluxo;
use App\Models\LogSistema;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExecutarFluxoController extends Controller
{
    /**
     * Inicia a execução imediata de um fluxo para um contato.
     */
    public function __invoke(Request $request): RedirectResponse
    {
        $dados = $request->validate([
            'fluxo_id' => ['required', 'integer', 'exists:fluxos,id'],
            'contato_id' => ['required', 'integer', 'exists:contatos,id'],
        ]);

        $fluxo = Fluxo::findOrFail($dados['fluxo_id']);

        return DB::transaction(function () use ($dados, $fluxo) {
            // Bloqueia a linha do contato para serializar execuções simultâneas
            // do mesmo contato durante a verificação e a criação da execução.
            $contato = Contato::lockForUpdate()->findOrFail($dados['contato_id']);

            if (! $fluxo->ativo) {
                return redirect()->back()->withErrors(['fluxo_id' => 'O fluxo deve estar ativo para ser executado.']);
            }

            $emAndamento = ExecucaoFluxo::where('contato_id', $contato->id)
                ->whereNull('concluida_em')
                ->lockForUpdate()
                ->exists();

            if ($emAndamento) {
                return redirect()->back()->withErrors(['contato_id' => 'Já existe uma execução em andamento para este contato.']);
            }

            $execucao = ExecucaoFluxo::create([
                'contato_id' => $contato->id,
                'fluxo_id' => $fluxo->id,
                'etapa_atual' => 1,
            ]);

            LogSistema::create([
                'evento' => 'execucao_manual_iniciada',
                'descricao' => "PSID {$contato->psid} executou manualmente o fluxo {$fluxo->nome}",
            ]);

            EnviarEtapaFluxo::dispatch($execucao->id);

            return redirect()->back();
        });
    }
}
