<?php

namespace App\Models;

use App\Support\FusosHorarios;
use Database\Factories\AccountFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Account extends Model
{
    /** @use HasFactory<AccountFactory> */
    use HasFactory;

    protected $fillable = [
        'name',
        'timezone',
        'timezone_confirmado',
        'suspensa',
        'suspensa_em',
        'motivo_suspensao',
        'suspensa_por',
        'reativada_em',
        'reativada_por',
        'administrador_responsavel_id',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'timezone_confirmado' => 'boolean',
            'suspensa' => 'boolean',
            'suspensa_em' => 'datetime',
            'reativada_em' => 'datetime',
        ];
    }

    public function user(): HasOne
    {
        return $this->hasOne(User::class);
    }

    public function contatos(): HasMany
    {
        return $this->hasMany(Contato::class);
    }

    public function fluxos(): HasMany
    {
        return $this->hasMany(Fluxo::class);
    }

    public function execucoes(): HasMany
    {
        return $this->hasMany(ExecucaoFluxo::class);
    }

    public function agendamentos(): HasMany
    {
        return $this->hasMany(Agendamento::class);
    }

    public function logs(): HasMany
    {
        return $this->hasMany(LogSistema::class);
    }

    public function messengerIntegration(): HasOne
    {
        return $this->hasOne(MessengerIntegration::class);
    }

    public function origensContato(): HasMany
    {
        return $this->hasMany(OrigemContato::class);
    }

    public function suspensaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'suspensa_por');
    }

    public function reativadaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reativada_por');
    }

    public function administradorResponsavel(): BelongsTo
    {
        return $this->belongsTo(User::class, 'administrador_responsavel_id');
    }

    public function estaSuspensa(): bool
    {
        return $this->suspensa === true;
    }

    /**
     * Fuso IANA confirmado da conta, ou null quando a configuração regional
     * ainda não foi validada. Nunca usa o fuso global como substituto.
     */
    public function fusoHorarioConfirmado(): ?string
    {
        $fuso = $this->timezone;

        if ($this->timezone_confirmado !== true || ! FusosHorarios::identificadorValido($fuso)) {
            return null;
        }

        return $fuso;
    }
}
