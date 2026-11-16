<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Support\FusosHorarios;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Schema;

#[Fillable(['name', 'email', 'password', 'account_id', 'timezone', 'timezone_confirmado', 'last_login_at'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'timezone_confirmado' => 'boolean',
            'last_login_at' => 'datetime',
        ];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    /**
     * Indica se o email está autorizado a administrar convites da plataforma.
     */
    public function isAdministradorPlataforma(): bool
    {
        return in_array(
            mb_strtolower($this->email),
            config('flowchat.administradores_plataforma', []),
            true,
        );
    }

    /**
     * Configuração regional da conta, com fallback temporário para as colunas
     * antigas do usuário enquanto a migration de contas não for executada.
     *
     * @return array{timezone: string|null, confirmado: bool}
     */
    public function dadosFusoHorario(): array
    {
        if (Schema::hasTable('accounts') && Schema::hasColumn('users', 'account_id')) {
            $conta = $this->account;

            if ($conta !== null) {
                return [
                    'timezone' => $conta->timezone,
                    'confirmado' => (bool) $conta->timezone_confirmado,
                ];
            }
        }

        return [
            'timezone' => $this->timezone,
            'confirmado' => (bool) $this->timezone_confirmado,
        ];
    }

    /**
     * Indica se o fuso da conta foi confirmado; usa as colunas antigas do
     * usuário apenas enquanto a migration de contas estiver pendente.
     */
    public function fusoConfirmado(): bool
    {
        $fuso = $this->dadosFusoHorario();

        return $fuso['timezone'] !== null && $fuso['confirmado'];
    }

    /**
     * Fuso horário (identificador IANA) para interpretar horários informados
     * pela conta deste usuário, como a criação de agendamentos. Exige
     * confirmação prévia (fusoConfirmado); sem ela, devolve o fuso da aplicação.
     */
    public function fusoHorarioEfetivo(): string
    {
        $fuso = $this->dadosFusoHorario();

        if ($fuso['confirmado'] && FusosHorarios::identificadorValido($fuso['timezone'])) {
            return $fuso['timezone'];
        }

        return config('app.timezone');
    }
}
