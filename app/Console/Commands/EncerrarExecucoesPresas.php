<?php

namespace App\Console\Commands;

use App\Models\ExecucaoFluxo;
use App\Models\LogSistema;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('fluxos:encerrar-presas {--minutos=360}')]
#[Description('Encerra execuções de fluxo que ficaram sem atividade além do limite')]
class EncerrarExecucoesPresas extends Command
{
    /**
     * Uma execução só deveria ficar parada enquanto espera a pausa de uma
     * etapa, e a validação do editor não limita essa pausa. O padrão de seis
     * horas cobre pausas realistas sem deixar o contato bloqueado por dias.
     */
    public function handle(): int
    {
        $minutos = max(1, (int) $this->option('minutos'));
        $limite = now()->subMinutes($minutos);
        $encerradas = 0;

        ExecucaoFluxo::query()
            ->whereNull('concluida_em')
            ->where('updated_at', '<=', $limite)
            ->orderBy('id')
            ->chunkById(200, function ($execucoes) use (&$encerradas, $limite): void {
                foreach ($execucoes as $execucao) {
                    // Revalida antes de fechar: a execução pode ter avançado
                    // entre a consulta e este ponto.
                    $fechada = ExecucaoFluxo::query()
                        ->whereKey($execucao->id)
                        ->whereNull('concluida_em')
                        ->where('updated_at', '<=', $limite)
                        ->update(['concluida_em' => now()]);

                    if ($fechada === 0) {
                        continue;
                    }

                    $encerradas++;

                    LogSistema::create([
                        'account_id' => $execucao->account_id,
                        'evento' => 'fluxo_encerrado_sem_atividade',
                        'descricao' => "Execução {$execucao->id} interrompida por ficar sem atividade.",
                    ]);
                }
            });

        $this->info("Execuções encerradas: {$encerradas}");

        return self::SUCCESS;
    }
}
