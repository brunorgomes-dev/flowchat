<?php

namespace App\Actions\Mensagens;

use App\Models\Account;
use App\Models\EtapaFluxo;
use App\Models\ExecucaoFluxo;
use App\Models\LogSistema;

/**
 * Avalia o bloco de condição por horário no fuso confirmado da conta e segue
 * o primeiro intervalo válido; sem correspondência, segue a saída NÃO ou
 * encerra a execução.
 */
final class AvaliarCondicaoDeHorario
{
    /**
     * @return bool `true` quando a execução mudou de etapa e deve continuar.
     */
    public function executar(ExecucaoFluxo $execucao, EtapaFluxo $etapa, Account $conta): bool
    {
        $fuso = $conta->fusoHorarioConfirmado();

        // Sem fuso confirmado não há como escolher o caminho com segurança.
        if ($fuso === null) {
            $execucao->update(['concluida_em' => now()]);
            LogSistema::create([
                'account_id' => $conta->id,
                'evento' => 'condicao_horario_sem_fuso',
                'descricao' => "Execução {$execucao->id} encerrada: a conta não tem fuso horário confirmado para avaliar a condição da etapa {$etapa->ordem}",
            ]);

            return false;
        }

        $agora = now($fuso);
        $minutosAgora = $agora->hour * 60 + $agora->minute;
        $destino = null;
        $condicaoEscolhida = null;

        foreach ($etapa->condicoes()->get() as $condicao) {
            $inicio = self::minutosDaHora($condicao->inicio);
            $fim = self::minutosDaHora($condicao->fim);

            // Limites inclusivos com precisão de minuto.
            if ($minutosAgora >= $inicio && $minutosAgora <= $fim) {
                $destino = (int) $condicao->destino_ordem;
                $condicaoEscolhida = $condicao;
                break;
            }
        }

        if ($destino === null && $etapa->destino_nao_ordem !== null) {
            $destino = (int) $etapa->destino_nao_ordem;
        }

        if ($destino === null) {
            $execucao->update(['concluida_em' => now()]);
            LogSistema::create([
                'account_id' => $conta->id,
                'evento' => 'fluxo_concluido',
                'descricao' => "Execução {$execucao->id} concluída: nenhuma condição da etapa {$etapa->ordem} correspondia e não há saída NÃO",
            ]);

            return false;
        }

        // Destinos devem apontar para etapas posteriores; isto também impede
        // que dados antigos ou manipulados criem um ciclo infinito de saltos.
        if ($destino <= (int) $etapa->ordem) {
            $execucao->update(['concluida_em' => now()]);
            LogSistema::create([
                'account_id' => $conta->id,
                'evento' => 'condicao_horario_destino_invalido',
                'descricao' => "Execução {$execucao->id} encerrada: a condição da etapa {$etapa->ordem} aponta para a etapa {$destino}",
            ]);

            return false;
        }

        $execucao->update(['etapa_atual' => $destino]);

        LogSistema::create([
            'account_id' => $conta->id,
            'evento' => 'condicao_horario_avaliada',
            'descricao' => "Execução {$execucao->id}: etapa {$etapa->ordem} às {$agora->format('H:i')} ({$fuso}) seguiu para a etapa {$destino}"
                .($condicaoEscolhida === null ? ' pela saída NÃO' : ''),
        ]);

        return true;
    }

    /**
     * Converte uma hora "HH:MM" ou "HH:MM:SS" em minutos do dia.
     */
    private static function minutosDaHora(?string $hora): int
    {
        $partes = explode(':', (string) $hora);

        return ((int) ($partes[0] ?? 0)) * 60 + ((int) ($partes[1] ?? 0));
    }
}
