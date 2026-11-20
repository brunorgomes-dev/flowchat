<?php

namespace App\Support\Fluxos;

use App\Models\User;
use Illuminate\Validation\ValidationException;

/**
 * Valida a janela de horário de início do fluxo e devolve os atributos a
 * persistir.
 *
 * Sem as colunas no banco o recurso fica fail-closed: ativar a janela falha,
 * desativar apenas limpa os campos.
 */
final class HorarioDeInicio
{
    /**
     * @param  array<string, mixed>  $dados
     * @return array<string, mixed>
     */
    public function atributos(array $dados, ?User $utilizador): array
    {
        if (! DisponibilidadeDeColunas::horario()) {
            if (filter_var($dados['horario']['ativo'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
                throw ValidationException::withMessages([
                    'horario' => 'A migration de horário de início ainda não foi executada neste banco de dados.',
                ]);
            }

            return [];
        }

        $horario = $dados['horario'] ?? [];
        $ativo = filter_var($horario['ativo'] ?? false, FILTER_VALIDATE_BOOLEAN);

        if (! $ativo) {
            // Configuração desativada: limpa a janela e mantém o comportamento atual
            return [
                'horario_inicio_ativo' => false,
                'horario_inicio' => null,
                'horario_fim' => null,
                'fora_horario' => 'nao_iniciar',
            ];
        }

        // Enquanto o fuso horário da conta não estiver confirmado, novas
        // janelas de horário ficam bloqueadas: o horário informado pelo
        // usuário precisa ser interpretado numa região conhecida. Enquanto
        // a migration de fuso não correr, o comportamento atual é preservado.
        if (DisponibilidadeDeColunas::fuso() && ($utilizador === null || ! $utilizador->fusoConfirmado())) {
            throw ValidationException::withMessages([
                'horario' => 'Confirme o seu fuso horário em Configurações antes de ativar o horário de início.',
            ]);
        }

        $inicio = $horario['inicio'] ?? null;
        $fim = $horario['fim'] ?? null;

        if ($inicio === null || $fim === null) {
            throw ValidationException::withMessages([
                'horario' => 'Define a hora inicial e a hora final para ativar o horário de início.',
            ]);
        }

        if ($inicio === $fim) {
            throw ValidationException::withMessages([
                'horario' => 'A hora inicial e a hora final devem ser diferentes.',
            ]);
        }

        return [
            'horario_inicio_ativo' => true,
            'horario_inicio' => $inicio,
            'horario_fim' => $fim,
            'fora_horario' => in_array($horario['fora_horario'] ?? null, ['nao_iniciar', 'aguardar'], true)
                ? $horario['fora_horario']
                : 'nao_iniciar',
        ];
    }
}
