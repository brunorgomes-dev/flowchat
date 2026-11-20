<?php

namespace App\Support\Contatos;

use App\Models\Contato;
use App\Support\TimestampEventoMeta;
use Carbon\Carbon;
use Carbon\CarbonInterface;

/**
 * Janela de 24 horas da Meta: quando ela está disponível no banco e qual o
 * instante registrado da última mensagem recebida.
 */
final class JanelaDeMensagemLivre
{
    public function disponivel(): bool
    {
        return Contato::janelaDeMensagemLivreDisponivel();
    }

    public function limite(Contato $contato): ?CarbonInterface
    {
        return $contato->limiteDaJanelaDeMensagemLivre();
    }

    /**
     * Registra o instante da última mensagem recebida, base da janela de
     * 24 horas. Usa o timestamp do evento (e não o momento do processamento)
     * e nunca retrocede a janela quando um evento chega fora de ordem. Sem
     * timestamp de evento válido, a janela não é renovada.
     */
    public function renovar(Contato $contato, ?int $timestampEventoMs): void
    {
        if (! $this->disponivel()) {
            return;
        }

        $instante = $this->instanteDoEvento($timestampEventoMs);
        if ($instante === null) {
            return;
        }

        // Atualização condicional e monotônica: um evento atrasado não pode
        // encurtar a janela já registrada por outro mais recente.
        $atualizado = $contato->newQuery()
            ->whereKey($contato->id)
            ->where(fn ($consulta) => $consulta
                ->whereNull('ultima_mensagem_recebida_em')
                ->orWhere('ultima_mensagem_recebida_em', '<', $instante))
            ->update(['ultima_mensagem_recebida_em' => $instante]);

        if ($atualizado > 0) {
            $contato->refresh();
        }
    }

    /**
     * Instante do evento da Meta, convertido do timestamp em milissegundos.
     * Devolve null quando o payload não traz um timestamp normalizado
     * válido, para que a janela permaneça sem renovação.
     */
    private function instanteDoEvento(?int $timestampEventoMs): ?CarbonInterface
    {
        $timestampMs = TimestampEventoMeta::normalizar($timestampEventoMs);

        return $timestampMs !== null
            ? Carbon::createFromTimestampMs($timestampMs)->timezone(config('app.timezone'))
            : null;
    }
}
