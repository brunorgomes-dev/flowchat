<?php

namespace App\Models;

use Carbon\Carbon;
use Carbon\CarbonInterface;
use Database\Factories\FluxoFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Fluxo extends Model
{
    /** @use HasFactory<FluxoFactory> */
    use HasFactory;

    protected $fillable = ['account_id', 'nome', 'ativo', 'horario_inicio_ativo', 'horario_inicio', 'horario_fim', 'fora_horario'];

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'horario_inicio_ativo' => 'boolean',
        ];
    }

    /**
     * Indica se o fluxo tem uma janela de horário de início configurada.
     * Enquanto a migration de horário não for executada, os atributos não
     * existem e o fluxo mantém o comportamento de iniciar a qualquer hora.
     */
    public function horarioInicioConfigurado(): bool
    {
        return $this->horario_inicio_ativo === true
            && $this->horario_inicio !== null
            && $this->horario_fim !== null;
    }

    /**
     * Verifica se o momento informado (ou agora) está dentro da janela
     * permitida para iniciar o fluxo. Suporta janelas que atravessam a
     * meia-noite (ex.: 22:00 até 06:00) e considera os limites inclusivos.
     * O fuso do momento informado define a interpretação da janela: hoje é
     * o fuso da aplicação (config/app.php); quando o isolamento por conta
     * existir, os chamadores passarão now($fusoDaContaDoFluxo).
     */
    public function dentroDoHorarioInicio(?CarbonInterface $momento = null): bool
    {
        if (! $this->horarioInicioConfigurado()) {
            return true;
        }

        $atual = self::minutosDoDia($momento ?? now());
        $inicio = self::minutosDaHora($this->horario_inicio);
        $fim = self::minutosDaHora($this->horario_fim);

        if ($inicio <= $fim) {
            return $atual >= $inicio && $atual <= $fim;
        }

        // Janela que atravessa a meia-noite
        return $atual >= $inicio || $atual <= $fim;
    }

    /**
     * Primeiro momento futuro em que o fluxo pode ser iniciado, quando o
     * momento informado está fora da janela permitida. Devolve null quando
     * o fluxo não tem janela configurada ou já está dentro dela. O fuso do
     * momento informado define a interpretação da janela: hoje é o fuso da
     * aplicação (config/app.php); quando o isolamento por conta existir, os
     * chamadores passarão now($fusoDaContaDoFluxo) e deverão normalizar o
     * resultado para o fuso da aplicação antes de persistir executar_em.
     */
    public function proximoInicioPermitido(?CarbonInterface $momento = null): ?Carbon
    {
        if (! $this->horarioInicioConfigurado() || $this->dentroDoHorarioInicio($momento)) {
            return null;
        }

        $referencia = Carbon::instance($momento ?? now());
        $atual = self::minutosDoDia($referencia);
        $inicio = self::minutosDaHora($this->horario_inicio);
        $fim = self::minutosDaHora($this->horario_fim);

        [$hora, $minuto] = [intdiv($inicio, 60), $inicio % 60];

        // Fora de uma janela que atravessa a meia-noite, o próximo início é hoje;
        // numa janela comum, antes do início começa hoje e depois do fim, amanhã.
        $dia = $inicio > $fim || $atual < $inicio ? $referencia->copy() : $referencia->copy()->addDay();

        return $dia->setTime($hora, $minuto, 0);
    }

    /**
     * Converte uma hora "HH:MM" ou "HH:MM:SS" em minutos do dia.
     */
    private static function minutosDaHora(?string $hora): int
    {
        $partes = explode(':', (string) $hora);

        return ((int) ($partes[0] ?? 0)) * 60 + ((int) ($partes[1] ?? 0));
    }

    /**
     * Minutos do dia (0 a 1439) de um momento, ignorando os segundos.
     */
    private static function minutosDoDia(CarbonInterface $momento): int
    {
        return $momento->hour * 60 + $momento->minute;
    }

    public function etapas(): HasMany
    {
        return $this->hasMany(EtapaFluxo::class)->orderBy('ordem');
    }

    public function execucoes(): HasMany
    {
        return $this->hasMany(ExecucaoFluxo::class);
    }

    public function agendamentos(): HasMany
    {
        return $this->hasMany(Agendamento::class);
    }

    public function regras(): HasMany
    {
        return $this->hasMany(RegraInicioFluxo::class);
    }
}
